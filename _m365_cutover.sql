-- ============================================================================
-- Microsoft 365 ログインへの完全移行（切り替え当日に実行する。H3・H5 の対応）
-- ログインしていない人（anon）が読める・書ける設定をすべて外し、ログインした人（authenticated）だけにする。
--
-- 実行の順番:
--   1. 全アプリの M365_ONLY を true にして push（アプリ側をログイン必須にする）
--   2. このSQLを SQL Editor で実行
--   3. 動作確認。問題があれば _m365_cutover_rollback.sql で元に戻す
--
-- 変更前の設定は public.policy_backup に保存してから変更する（元に戻すときに使う）。
-- 新しく作る設定の名前はすべて m365_ で始まる。
-- 体制表（org_charts）の閲覧は、将来社外の人が見る可能性があるため、ログインなしのまま残す。
-- 承認フローの写真（pending-item-photos）は通知メールに画像として載せているため、公開のまま残す。
-- ============================================================================

begin;

-- ---------- 0. 変更前の設定を保存 ----------
create table if not exists public.policy_backup (
  taken_at timestamptz not null default now(),
  label    text not null,
  stmt     text not null
);
alter table public.policy_backup enable row level security;  -- ポリシーなし＝アプリからは見えない
revoke all on public.policy_backup from anon, authenticated;

insert into public.policy_backup (label, stmt)
select 'm365_cutover',
  format('drop policy if exists %I on %I.%I; create policy %I on %I.%I as %s for %s to %s%s%s;',
    policyname, schemaname, tablename, policyname, schemaname, tablename, permissive, cmd,
    array_to_string(array(select quote_ident(r) from unnest(roles) r), ', '),
    case when qual is not null then ' using (' || qual || ')' else '' end,
    case when with_check is not null then ' with check (' || with_check || ')' else '' end)
from pg_policies
where ((schemaname = 'public' and (roles::text like '%anon%' or roles::text like '%public%'))
    or (schemaname = 'storage' and policyname like '%splat-files%'))
  and not (schemaname = 'public' and tablename = 'org_charts');

-- ---------- 1. 管理者（電気工程表・3Dモデルアプリの編集者）----------
create or replace function public.is_core_admin()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'e-kurosaki@kusakabe.com',   -- 黒崎
    's-morimura@kusakabe.com',   -- 森村
    'm2-kusakabe@kusakabe.com'   -- 常務
  ]);
$$;
revoke execute on function public.is_core_admin() from public, anon;
grant execute on function public.is_core_admin() to authenticated;

-- ---------- 2. ログインなしで読めるだけの設定を外す ----------
drop policy if exists approval_notifications_anon_select       on public.approval_notifications;
drop policy if exists approval_requests_anon_select            on public.approval_requests;
drop policy if exists approval_steps_anon_select               on public.approval_steps;
drop policy if exists assembly_unit_not_required_anon_select   on public.assembly_unit_not_required;
drop policy if exists electrical_unit_not_required_anon_select on public.electrical_unit_not_required;
drop policy if exists flow_settings_anon_select                on public.flow_settings;
drop policy if exists invitation_rsvp_anon_select              on public.invitation_rsvp;
drop policy if exists anon_select_members                      on public.members;
drop policy if exists profiles_anon_select                     on public.profiles;
drop policy if exists shipping_date_change_log_anon_select     on public.shipping_date_change_log;
drop policy if exists test_run_readiness_anon_select           on public.test_run_readiness;

-- ---------- 3. 「誰でも」の読み取りを「ログインした人」に変える ----------
alter policy "全員が読み取り可"                    on public.app_settings       to authenticated;
alter policy "Allow public read completed_projects" on public.completed_projects to authenticated;
alter policy holidays_select_anon_authenticated     on public.holidays           to authenticated;
alter policy holidays_select_public_read            on public.holidays           to authenticated;
alter policy operation_access_select                on public.operation_schedule_access to authenticated;
alter policy reminder_settings_select_all           on public.reminder_settings  to authenticated;
alter policy reminder_settings_insert_admin         on public.reminder_settings  to authenticated;
alter policy reminder_settings_update_admin         on public.reminder_settings  to authenticated;
alter policy "Enable read access for all users"     on public.task_template      to authenticated;
alter policy "Allow read for all"                   on public.task_template_a    to authenticated;
alter policy "Allow read for all"                   on public.task_template_c    to authenticated;
alter policy "Allow read for all"                   on public.task_template_t    to authenticated;
alter policy tasks_select_public_read               on public.tasks              to authenticated;
alter policy "Allow public read change_log"         on public.change_log         to authenticated;
alter policy "Allow public read sync_log"           on public.sync_log           to authenticated;

-- ---------- 4. 書き込みの設定 ----------
-- change_log（全体工程表・操業工程表の変更履歴）: 工程表の編集者・登録済みの社員だけが追加できる
drop policy if exists "Allow auth insert change_log" on public.change_log;
create policy m365_change_log_insert on public.change_log for insert to authenticated
  with check (schedule_is_editor() or is_registered_user());

-- sync_log: アプリからは使っていない（書き込みはサーバー側の処理だけ）
drop policy if exists "Allow auth insert sync_log" on public.sync_log;

-- packing_shipping_status: アプリからは使っていない。ログインした人が読むだけ
drop policy if exists "allow all" on public.packing_shipping_status;
create policy m365_packing_shipping_status_read on public.packing_shipping_status for select to authenticated using (true);

-- 入出荷一覧表（deliveries / task_shipment_overlays）: ログインした社員なら誰でも編集できる
drop policy if exists anon_read  on public.deliveries;
drop policy if exists anon_write on public.deliveries;
create policy m365_deliveries_all on public.deliveries for all to authenticated using (true) with check (true);

drop policy if exists anon_read_task_shipment_overlays  on public.task_shipment_overlays;
drop policy if exists anon_write_task_shipment_overlays on public.task_shipment_overlays;
create policy m365_task_shipment_overlays_all on public.task_shipment_overlays for all to authenticated using (true) with check (true);

-- 電気工程表（denki_process_status / denki_visible_projects）: 読むのはログインした人、編集は黒崎・森村・常務
drop policy if exists allow_all on public.denki_process_status;
create policy m365_denki_process_status_read  on public.denki_process_status for select to authenticated using (true);
create policy m365_denki_process_status_write on public.denki_process_status for all to authenticated
  using (is_core_admin()) with check (is_core_admin());

drop policy if exists allow_all on public.denki_visible_projects;
create policy m365_denki_visible_projects_read  on public.denki_visible_projects for select to authenticated using (true);
create policy m365_denki_visible_projects_write on public.denki_visible_projects for all to authenticated
  using (is_core_admin()) with check (is_core_admin());

-- 3Dモデルアプリ（sharepoint_file_meta と splat-files）: 読むのはログインした人、編集は黒崎・森村・常務
drop policy if exists "read all file meta"   on public.sharepoint_file_meta;
drop policy if exists "insert all file meta" on public.sharepoint_file_meta;
drop policy if exists "update all file meta" on public.sharepoint_file_meta;
drop policy if exists "delete all file meta" on public.sharepoint_file_meta;
create policy m365_sharepoint_file_meta_read  on public.sharepoint_file_meta for select to authenticated using (true);
create policy m365_sharepoint_file_meta_write on public.sharepoint_file_meta for all to authenticated
  using (is_core_admin()) with check (is_core_admin());

drop policy if exists "allow uploads to splat-files" on storage.objects;
drop policy if exists "allow update to splat-files"  on storage.objects;
drop policy if exists "allow delete to splat-files"  on storage.objects;
create policy m365_splat_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'splat-files' and public.is_core_admin());
create policy m365_splat_files_update on storage.objects for update to authenticated
  using (bucket_id = 'splat-files' and public.is_core_admin());
create policy m365_splat_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'splat-files' and public.is_core_admin());

commit;

-- ---------- 確認（ログインなしで読める・書ける設定が org_charts 以外に残っていないこと）----------
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and (roles::text like '%anon%' or roles::text like '%public%'))
   or (schemaname = 'storage' and roles::text like '%public%')
order by 1, 2, 3;
