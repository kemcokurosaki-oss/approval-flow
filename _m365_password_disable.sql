-- ============================================================================
-- 社員アカウントの自作パスワードを無効にする（M365ログイン完全移行の仕上げ。2026-10-26）
--   ・対象：@kusakabe.com のアカウントで、パスワードが設定されているもの（外注先アカウント contractor_accounts は対象外）
--   ・パスワードを誰にも分からないランダムな値に置き換える。Microsoft（M365）でのログインはこれまでどおり使える
--   ・M365でまだ一度もログインしていない社員も、次にM365でログインすると同じアカウントにつながる（メールアドレスが同じため）
--   ・非常用の ?pw=1 のパスワードログインも、社員はこれで使えなくなる
--   ・変更前のパスワード（暗号化されたもの）は private.password_backup_20261026 に保存する（外から読めない場所）
--     元に戻すときは _m365_password_disable_rollback.sql を実行する
-- Supabase の SQL Editor で1回だけ実行してください。
-- ============================================================================

begin;

-- 0. 変更前の値を保存する場所（API から見えない private スキーマ。anon・authenticated からは読めない）
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.password_backup_20261026 (
  id uuid primary key,
  email text,
  encrypted_password text,
  backed_up_at timestamptz not null default now()
);
revoke all on private.password_backup_20261026 from public, anon, authenticated;

-- 1. 対象のアカウントの今のパスワードを保存
insert into private.password_backup_20261026 (id, email, encrypted_password)
select u.id, u.email, u.encrypted_password
  from auth.users u
 where u.email ilike '%@kusakabe.com'
   and coalesce(u.encrypted_password, '') <> ''
   and not exists (select 1 from public.contractor_accounts c where c.id = u.id)
on conflict (id) do nothing;

-- 2. パスワードをランダムな値に置き換える（値はどこにも残らない）
update auth.users u
   set encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
       updated_at = now()
 where u.id in (select id from private.password_backup_20261026);

-- 3. 確認：保存した件数（＝置き換えた件数）
select count(*) as replaced from private.password_backup_20261026;

commit;
