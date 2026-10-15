-- 新規登録を「日下部電機の Microsoft 365 アカウント」と「許可リストのアドレス」に限るフック（2026-10-15）
-- Supabase の Before User Created フックに public.hook_before_user_created を設定して使う。
-- フックを有効にしてから「Allow new users to sign up」を ON にすること（逆順だと一時的に誰でも登録できてしまう）。

-- 管理者が作るアカウント（外注先・社員・招待）のアドレス。作成処理が作成の直前に登録する
create table if not exists public.signup_allowlist (
  email      text primary key,
  reason     text,
  created_at timestamptz not null default now()
);
alter table public.signup_allowlist enable row level security;  -- ポリシーなし＝アプリからは読めない（service_role とフックだけが使う）
revoke all on public.signup_allowlist from anon, authenticated;
grant select on public.signup_allowlist to supabase_auth_admin;
-- フックを実行する supabase_auth_admin は RLS を受けるため、読み取りだけ許可する（無いと許可リストが空に見える）
create policy signup_allowlist_auth_admin_read on public.signup_allowlist for select to supabase_auth_admin using (true);

create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_provider text := event->'user'->'app_metadata'->>'provider';
  v_email    text := lower(coalesce(event->'user'->>'email', ''));
begin
  -- Microsoft 365 でのログイン（Azure プロバイダーはテナント限定）で、会社のアドレスなら自動作成を許可
  if v_provider = 'azure' and v_email like '%@kusakabe.com' then
    return '{}'::jsonb;
  end if;
  -- 管理者が作成処理から登録したアドレス
  if exists (select 1 from public.signup_allowlist a where lower(a.email) = v_email) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message',   '新規登録は日下部電機のMicrosoftアカウントでのログインのみ受け付けています。'
  ));
end;
$$;

grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;


-- ===== 元に戻す場合（先に管理画面でフックを無効にし、Allow new users to sign up を OFF に戻す） =====
-- drop function if exists public.hook_before_user_created(jsonb);
-- drop table if exists public.signup_allowlist;
