-- M365 ログインで社員のアカウントを自動作成する前に、「ログインしていれば誰でも書ける」表を締める（2026-10-15）
-- 自動作成された社員は profiles に入らない（閲覧のみ）ので、書き込みは profiles にいる登録済みの社員と外注先に限る。
-- 読み取りの設定は変えない。サーバー側の処理（service_role）はこの制限を受けない。

-- 登録済みの社員（profiles にいる人）か
create or replace function public.is_registered_user()
returns boolean
language sql
stable security definer
set search_path to 'public'
as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;
revoke execute on function public.is_registered_user() from public, anon;
grant execute on function public.is_registered_user() to authenticated;

-- 承認系の7表: 書き込みは登録済みの社員と外注先だけ（RESTRICTIVE なので既存の許可と AND で効く）
do $$
declare t text;
begin
  foreach t in array array['approval_requests','approval_steps','approval_notifications','test_run_readiness',
                           'shipping_date_change_log','assembly_unit_not_required','electrical_unit_not_required']
  loop
    execute format('create policy registered_only_insert on public.%I as restrictive for insert to authenticated with check (is_registered_user() or is_contractor())', t);
    execute format('create policy registered_only_update on public.%I as restrictive for update to authenticated using (is_registered_user() or is_contractor()) with check (is_registered_user() or is_contractor())', t);
    execute format('create policy registered_only_delete on public.%I as restrictive for delete to authenticated using (is_registered_user() or is_contractor())', t);
  end loop;
end $$;

-- invitation_rsvp: アプリからは読むだけ（書き込みは出欠集計 check-rsvp が service_role で行う）
drop policy if exists invitation_rsvp_authenticated_all on public.invitation_rsvp;
create policy invitation_rsvp_authenticated_select on public.invitation_rsvp for select to authenticated using (true);

-- app_settings: 書き込みは工程表の編集者だけ（全体工程表の「公開」）
create policy app_settings_editors_insert on public.app_settings as restrictive for insert to authenticated with check (schedule_is_editor());
create policy app_settings_editors_update on public.app_settings as restrictive for update to authenticated using (schedule_is_editor()) with check (schedule_is_editor());


-- ===== 元に戻す場合 =====
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['approval_requests','approval_steps','approval_notifications','test_run_readiness',
--                            'shipping_date_change_log','assembly_unit_not_required','electrical_unit_not_required']
--   loop
--     execute format('drop policy if exists registered_only_insert on public.%I', t);
--     execute format('drop policy if exists registered_only_update on public.%I', t);
--     execute format('drop policy if exists registered_only_delete on public.%I', t);
--   end loop;
-- end $$;
-- drop policy if exists invitation_rsvp_authenticated_select on public.invitation_rsvp;
-- create policy invitation_rsvp_authenticated_all on public.invitation_rsvp for all to authenticated using (true) with check (true);
-- drop policy if exists app_settings_editors_insert on public.app_settings;
-- drop policy if exists app_settings_editors_update on public.app_settings;
-- drop function if exists public.is_registered_user();
