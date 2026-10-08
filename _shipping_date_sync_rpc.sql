-- 確定出荷日（承認フロー）→ 工程表の工場出荷タスク日付への書き戻し用RPC
-- tasks の UPDATE は工程表の編集者（schedule_is_editor）に限られており、営業・品証が確定出荷日を
-- 保存しても工程表へ反映されなかった（RLSで0件更新になり無言で失敗）ための対策。
-- 日付は引数で受け取らず approval_requests に保存済みの値を使うため、呼び出し側が任意の日付を書き込むことはできない。
-- 分割出荷（同一機械に工場出荷タスク2件）は end_date 昇順で①②をそれぞれ更新する（app.js の syncShippingDateToTasks と同じ判定）。
-- shipping_date_locked には触れない。戻り値は更新した工場出荷タスクの件数。

CREATE OR REPLACE FUNCTION public.sync_factory_shipping_date(p_request_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    r       record;
    t_ids   bigint[];
    n       integer := 0;
    cnt     integer;
BEGIN
    IF auth.uid() IS NULL OR public.is_contractor() THEN
        RAISE EXCEPTION 'not allowed';
    END IF;

    SELECT project_number, machine_name, confirmed_shipping_date d1, confirmed_shipping_date_2 d2
      INTO r
      FROM public.approval_requests
     WHERE id = p_request_id AND flow_type = 'shipping';

    IF NOT FOUND OR r.d1 IS NULL OR coalesce(r.machine_name, '') = '' THEN
        RETURN 0;
    END IF;

    IF r.d2 IS NOT NULL THEN
        SELECT array_agg(id ORDER BY end_date NULLS LAST, id) INTO t_ids
          FROM public.tasks
         WHERE project_number = r.project_number AND machine = r.machine_name AND text = '工場出荷';
        IF t_ids IS NULL THEN RETURN 0; END IF;
        UPDATE public.tasks SET start_date = r.d1, end_date = r.d1 WHERE id = t_ids[1];
        GET DIAGNOSTICS cnt = ROW_COUNT; n := n + cnt;
        IF array_length(t_ids, 1) >= 2 THEN
            UPDATE public.tasks SET start_date = r.d2, end_date = r.d2 WHERE id = t_ids[2];
            GET DIAGNOSTICS cnt = ROW_COUNT; n := n + cnt;
        END IF;
    ELSE
        UPDATE public.tasks SET start_date = r.d1, end_date = r.d1
         WHERE project_number = r.project_number AND machine = r.machine_name AND text = '工場出荷';
        GET DIAGNOSTICS n = ROW_COUNT;
    END IF;

    RETURN n;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_factory_shipping_date(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_factory_shipping_date(uuid) TO authenticated;
