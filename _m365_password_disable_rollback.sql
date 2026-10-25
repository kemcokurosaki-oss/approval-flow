-- ============================================================================
-- 社員アカウントのパスワードを元に戻す（_m365_password_disable.sql の取り消し。問題があったときだけ使う）
--   private.password_backup_20261026 に保存した変更前のパスワード（暗号化されたもの）に戻す
--   戻したあと、保存した値を消すときは最後の drop の行のコメントを外して実行する
-- Supabase の SQL Editor で実行してください。
-- ============================================================================

begin;

update auth.users u
   set encrypted_password = b.encrypted_password,
       updated_at = now()
  from private.password_backup_20261026 b
 where u.id = b.id;

select count(*) as restored from private.password_backup_20261026;

commit;

-- 元に戻す必要がなくなったら（しばらく様子を見てから）、保存した値を消す：
-- drop table private.password_backup_20261026;
