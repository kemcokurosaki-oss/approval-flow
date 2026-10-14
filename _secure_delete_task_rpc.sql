-- セキュリティ診断 H1（2026-10-14）
-- ログインなしでもタスクを削除できた RPC を、編集者だけが使えるようにする。
-- tasks の DELETE ポリシー tasks_delete_editors と同じ判定（schedule_is_editor）を関数内でも行う。
-- 呼び出し元は全体工程表 gantt-events.js のタスク削除のみ（ログインした編集者の操作）なので、運用は変わらない。

CREATE OR REPLACE FUNCTION public.delete_task_with_change_log_source(p_task_id text, p_source text DEFAULT '全体工程表'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_src text;
BEGIN
  IF NOT public.schedule_is_editor() OR public.is_contractor() THEN
    RAISE EXCEPTION 'タスクを削除する権限がありません' USING ERRCODE = '42501';
  END IF;
  v_src := trim(both from coalesce(p_source, ''));
  IF v_src = '' THEN
    v_src := '全体工程表';
  END IF;
  PERFORM set_config('app.delete_change_log_source', v_src, true);
  DELETE FROM public.tasks
  WHERE id::text = trim(both from p_task_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_task_with_change_log_source(p_task_id text, p_source text DEFAULT '全体工程表'::text, p_user text DEFAULT ''::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_src  text;
  v_user text;
BEGIN
  IF NOT public.schedule_is_editor() OR public.is_contractor() THEN
    RAISE EXCEPTION 'タスクを削除する権限がありません' USING ERRCODE = '42501';
  END IF;
  v_src  := trim(both from coalesce(p_source, ''));
  v_user := trim(both from coalesce(p_user,   ''));
  IF v_src = '' THEN
    v_src := '全体工程表';
  END IF;
  PERFORM set_config('app.delete_change_log_source', v_src,  true);
  PERFORM set_config('app.change_user',              v_user, true);
  DELETE FROM public.tasks
  WHERE id::text = trim(both from p_task_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.delete_task_with_change_log_source(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_task_with_change_log_source(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_task_with_change_log_source(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_task_with_change_log_source(text, text, text) TO authenticated;

-- 編集者判定関数の search_path を固定する（SECURITY DEFINER のため）
ALTER FUNCTION public.schedule_is_editor() SET search_path = public;
