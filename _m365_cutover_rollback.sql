-- ============================================================================
-- _m365_cutover.sql を元に戻す（ログインなしでも読める・書ける状態に戻す）
-- アプリ側も元に戻す場合は、全アプリの M365_ONLY を false に戻して push する。
-- ============================================================================

begin;

-- 切り替えで新しく作った設定（名前が m365_ で始まるもの）を消す
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where policyname like 'm365\_%' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- 切り替えの直前に保存した設定を、そのまま作り直す
do $$
declare r record;
begin
  for r in
    select stmt from public.policy_backup
    where label = 'm365_cutover'
      and taken_at = (select max(taken_at) from public.policy_backup where label = 'm365_cutover')
  loop
    execute r.stmt;
  end loop;
end $$;

commit;

-- 確認（ログインなしで読める・書ける設定が戻っていること）
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and (roles::text like '%anon%' or roles::text like '%public%'))
   or (schemaname = 'storage' and roles::text like '%public%')
order by 1, 2, 3;
