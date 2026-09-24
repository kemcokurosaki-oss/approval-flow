-- ============================================================================
-- 外注先アカウント機能: スキーマ追加 + アクセス制御 (RLS)
--
-- 【適用方法】
--   Supabase ダッシュボード → SQL Editor に、このファイルの中身をそのまま
--   貼り付けて実行してください（このAIからは実行できません。要手動適用）。
--
-- 【前提・要確認】
--   approval_requests.id が uuid 型であることを前提にしています。
--   もし実際は bigint 等の場合、このファイル内の "uuid" と書かれている
--   request_id 関連の型を実際の型に置き換えてから実行してください
--   （Supabase Studio の Table Editor で approval_requests.id の型を確認できます）。
--
-- 【設計方針】
--   - 外注先ユーザーは profiles テーブルには入れず、専用の
--     contractor_accounts / contractor_assignments で管理する
--     （社内ユーザー前提のロジックに外注先が紛れ込まないようにするため）。
--   - 外注先ロールを持つユーザーは、既存の全テーブルに対して
--     RESTRICTIVE ポリシーで「デフォルト拒否」を追加する。
--     RESTRICTIVEは既存のPERMISSIVEポリシーとAND条件になるため、
--     既存ポリシーの中身を一切変更・調査しなくても安全に締め出せる。
--   - approval_requests だけ、割り当てられた行の閲覧のみ例外的に許可。
--     ただし直接のINSERT/UPDATE/DELETEは禁止し、書き込みは全て
--     SECURITY DEFINER の関数(RPC)経由のみに限定する
--     （status・requester_id・出荷日など関係ない列を外注先が
--       書き換えられないようにするため）。
--   - 外注先が保存しても status は変えない・承認フローは進めない。
--     必ず社内担当者が内容を確認してから「申請する」を押す運用。
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) テーブル追加
-- ----------------------------------------------------------------------------

create table if not exists contractor_accounts (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_name  text not null,
  contact_name  text,
  created_at    timestamptz not null default now(),
  disabled_at   timestamptz  -- NULLなら有効。値を入れると即アクセス不可にできる（アカウント削除は不要）
);
comment on table contractor_accounts is '外注先（社外）ユーザーの台帳。profilesとは別管理。';

create table if not exists contractor_assignments (
  id            bigint generated always as identity primary key,
  contractor_id uuid not null references contractor_accounts(id) on delete cascade,
  request_id    uuid not null references approval_requests(id) on delete cascade,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (contractor_id, request_id)
);
comment on table contractor_assignments is 'どの外注先アカウントがどのapproval_requests行を記入できるかの割り当て。';

alter table approval_requests
  add column if not exists contractor_submitted_at timestamptz;
comment on column approval_requests.contractor_submitted_at is
  '外注先がチェックシートを保存した日時。NULLでなければ社内担当者は内容確認の上「申請する」へ進める。この列自体は承認フローのstatusを変えない。';


-- ----------------------------------------------------------------------------
-- 2) ヘルパー関数（SECURITY DEFINERでRLSを気にせず判定できるようにする）
-- ----------------------------------------------------------------------------

create or replace function is_contractor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from contractor_accounts
    where id = auth.uid() and disabled_at is null
  );
$$;

create or replace function contractor_can_access_request(req_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from contractor_assignments ca
    join contractor_accounts c on c.id = ca.contractor_id
    where ca.contractor_id = auth.uid()
      and ca.request_id = req_id
      and ca.revoked_at is null
      and c.disabled_at is null
  );
$$;


-- ----------------------------------------------------------------------------
-- 3) contractor_accounts / contractor_assignments 自体のRLS
--    （本人の行だけ閲覧可。書き込みはEdge Function(サービスロール)のみ）
-- ----------------------------------------------------------------------------

alter table contractor_accounts enable row level security;
alter table contractor_assignments enable row level security;

drop policy if exists contractor_accounts_self_select on contractor_accounts;
create policy contractor_accounts_self_select on contractor_accounts
  as permissive for select to authenticated
  using ( id = auth.uid() );

drop policy if exists contractor_assignments_self_select on contractor_assignments;
create policy contractor_assignments_self_select on contractor_assignments
  as permissive for select to authenticated
  using ( contractor_id = auth.uid() );


-- ----------------------------------------------------------------------------
-- 4) 既存の全テーブルに「外注先はデフォルト全面拒否」を追加
--    (approval_requestsは次のセクションで個別に扱うためここでは対象外)
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
  deny_only_tables text[] := array[
    'app_settings','approval_notifications','approval_steps',
    'assembly_unit_not_required','completed_projects',
    'electrical_unit_not_required','flow_settings','invitation_rsvp',
    'members','notification_recipients','packing_shipping_status',
    'profiles','reminder_settings','settings_audit_log',
    'shipping_date_change_log','task_shipment_overlays','tasks',
    'test_run_readiness'
  ];
begin
  foreach t in array deny_only_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I enable row level security;', t);
      execute format('drop policy if exists contractor_default_deny on %I;', t);
      execute format(
        'create policy contractor_default_deny on %I as restrictive for all to authenticated using ( not is_contractor() );',
        t
      );
    end if;
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 5) approval_requests: 割り当てられた行の閲覧のみ許可。書き込みは直接禁止。
-- ----------------------------------------------------------------------------

alter table approval_requests enable row level security;

-- 書き込み系(insert/update/delete)は外注先には常に禁止（RPC経由のみ許可）
drop policy if exists contractor_deny_insert on approval_requests;
create policy contractor_deny_insert on approval_requests
  as restrictive for insert to authenticated
  with check ( not is_contractor() );

drop policy if exists contractor_deny_update on approval_requests;
create policy contractor_deny_update on approval_requests
  as restrictive for update to authenticated
  using ( not is_contractor() );

drop policy if exists contractor_deny_delete on approval_requests;
create policy contractor_deny_delete on approval_requests
  as restrictive for delete to authenticated
  using ( not is_contractor() );

-- select: 「外注先でない」または「割り当て済みの行」なら制限を通す(RESTRICTIVE)
drop policy if exists contractor_restrict_select on approval_requests;
create policy contractor_restrict_select on approval_requests
  as restrictive for select to authenticated
  using ( not is_contractor() or contractor_can_access_request(id) );

-- select: 割り当て済みの行を見せるための許可(PERMISSIVE)を追加
-- （既存のPERMISSIVEポリシーがprofiles前提などで外注先を弾いてしまう場合に備え、
--   このポリシー自体が「見せてよい」根拠になるようにする）
drop policy if exists contractor_permissive_select on approval_requests;
create policy contractor_permissive_select on approval_requests
  as permissive for select to authenticated
  using ( is_contractor() and contractor_can_access_request(id) );


-- ----------------------------------------------------------------------------
-- 6) 外注先が使うRPC（チェックシートの閲覧・保存はここだけを経由させる）
-- ----------------------------------------------------------------------------

create or replace function contractor_list_my_requests()
returns table (
  id                       uuid,
  project_number           text,
  machine_name             text,
  assembly_items           jsonb,
  sheet_data               jsonb,
  contractor_submitted_at  timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select r.id, r.project_number, r.machine_name, r.assembly_items,
         r.sheet_data, r.contractor_submitted_at
  from approval_requests r
  join contractor_assignments ca on ca.request_id = r.id
  join contractor_accounts c on c.id = ca.contractor_id
  where ca.contractor_id = auth.uid()
    and ca.revoked_at is null
    and c.disabled_at is null;
$$;
grant execute on function contractor_list_my_requests() to authenticated;

create or replace function contractor_save_checklist(
  p_request_id     uuid,
  p_check_items    jsonb,
  p_pending_items  jsonb,
  p_completion_date date
)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not contractor_can_access_request(p_request_id) then
    raise exception 'この案件へのアクセス権限がありません';
  end if;

  update approval_requests
  set sheet_data = coalesce(sheet_data, '{}'::jsonb) || jsonb_build_object(
        'check_items',   p_check_items,
        'pending_items', p_pending_items,
        'meta', coalesce(sheet_data->'meta', '{}'::jsonb) || jsonb_build_object(
          'completion_date', p_completion_date
        )
      ),
      contractor_submitted_at = now()
  where id = p_request_id;
end;
$$;
grant execute on function contractor_save_checklist(uuid, jsonb, jsonb, date) to authenticated;

-- ============================================================================
-- 適用後の確認方法（例）
--   1. Supabase Studio > Authentication で外注先用のテストユーザーを作成
--   2. contractor_accounts に手動で1行INSERT（そのユーザーのid, company_name）
--   3. contractor_assignments に、テスト対象のapproval_requests.idを1行INSERT
--   4. gaichu_sheet.html にそのテストユーザーでログインし、
--      該当案件だけが見え、他は見えないことを確認
--   5. 保存後、通常の社内ログインでその案件を開き、内容が反映されているか、
--      status が変わっていないことを確認
-- ============================================================================
