-- セキュリティ定期チェック（scripts/security-check.js）用の読み取り専用DBユーザー
-- 2026-10-14 適用済み。パスワードはここには書かず、GitHub Secrets の SECURITY_MONITOR_DB_URL にだけ置く
--
-- このユーザーは pg_policies などの設定情報だけを読める。業務テーブルの中身は読めず、書き込みもできない。
-- 接続はプーラー経由（ユーザー名は security_monitor.<プロジェクトID>）:
--   postgresql://security_monitor.dgekjzkrybrswsxlcbvh:<パスワード>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

create role security_monitor with login password '<パスワード>' nosuperuser nocreatedb nocreaterole noinherit nobypassrls connection limit 3;
alter role security_monitor set default_transaction_read_only = on;
alter role security_monitor set statement_timeout = '30s';

-- auth / storage スキーマは直接読ませず、必要な列だけを返す関数を用意する（API 非公開の monitor スキーマ）
create schema if not exists monitor;
revoke all on schema monitor from public;
grant usage on schema monitor to security_monitor;

create or replace function monitor.auth_users_summary()
returns table(masked_email text, created_at timestamptz, confirmed boolean, last_sign_in_at timestamptz, is_company boolean)
language sql security definer set search_path = '' as $$
  select left(u.email,2)||'***@'||split_part(u.email,'@',2), u.created_at, u.email_confirmed_at is not null, u.last_sign_in_at, u.email ilike '%@kusakabe.com'
  from auth.users u
$$;

create or replace function monitor.storage_buckets()
returns table(id text, public boolean, file_size_limit bigint, allowed_mime_types text[])
language sql security definer set search_path = '' as $$
  select b.id, b.public, b.file_size_limit, b.allowed_mime_types from storage.buckets b
$$;

revoke all on function monitor.auth_users_summary() from public;
revoke all on function monitor.storage_buckets() from public;
grant execute on function monitor.auth_users_summary() to security_monitor;
grant execute on function monitor.storage_buckets() to security_monitor;

-- パスワードを変えるとき:
--   alter role security_monitor with password '<新しいパスワード>';
-- やめるとき:
--   drop schema monitor cascade; drop role security_monitor;
