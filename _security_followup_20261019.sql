-- セキュリティ再確認（2026-10-19、M365 完全移行後）で見つかった点の修正
-- M365 移行で「閲覧のみの社員」も自動でアカウントを持つようになったため、書き込みの条件を締め直す。
-- どれも画面の動作は変わらない見込み（書き込める人は今の運用どおり）。

-- 1) 承認フローのペンディング写真：ログインした人なら誰でも全写真を追加・差し替え・削除できた
--    → 登録済みの社員（profiles にいる人）と外注先だけにする（閲覧は今までどおり）
ALTER POLICY pending_item_photos_authenticated_insert ON storage.objects
  WITH CHECK (bucket_id = 'pending-item-photos' AND (public.is_registered_user() OR public.is_contractor()));
ALTER POLICY pending_item_photos_authenticated_update ON storage.objects
  USING      (bucket_id = 'pending-item-photos' AND (public.is_registered_user() OR public.is_contractor()))
  WITH CHECK (bucket_id = 'pending-item-photos' AND (public.is_registered_user() OR public.is_contractor()));
ALTER POLICY pending_item_photos_authenticated_delete ON storage.objects
  USING      (bucket_id = 'pending-item-photos' AND (public.is_registered_user() OR public.is_contractor()));

-- 2) 入出荷（deliveries）：外注先アカウントを除外する設定がなかった（今は外注先0件）
--    → 他の表と同じ contractor_default_deny を付ける
CREATE POLICY contractor_default_deny ON public.deliveries
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (NOT public.is_contractor());

-- 3) ログインしていない人（anon）が SECURITY DEFINER 関数を直接呼べた
--    → M365 移行で anon 向けの読み書き設定がなくなったので、anon からの実行権限を外す
--      （ログインした人には個別に付与済みのため、アプリの動作は変わらない）
REVOKE EXECUTE ON FUNCTION public.contractor_can_access_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.contractor_list_my_requests() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.contractor_save_checklist(uuid, jsonb, jsonb, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_contractor() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_chart_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.schedule_is_allowed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.schedule_is_editor() FROM PUBLIC, anon;
--    トリガー関数は API から呼ぶものではないので、ログインした人からも外す（トリガーとしては今までどおり動く）
REVOKE EXECUTE ON FUNCTION public.tr_log_assembly_task_delete_change_log() FROM PUBLIC, anon, authenticated;

-- 4) サインアップ判定の関数（hook_before_user_created）の参照先を固定する
ALTER FUNCTION public.hook_before_user_created(jsonb) SET search_path = '';

-- 5) 確定出荷日の書き戻し（sync_factory_shipping_date）：未登録の社員（M365 で自動作成された閲覧のみの人）も実行できた
--    → 登録済みの社員だけにする（判定以外は変更なし）
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
    IF auth.uid() IS NULL OR public.is_contractor() OR NOT public.is_registered_user() THEN
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
        UPDATE public.tasks SET start_date = r.d1, end_date = r.d1, shipping_date_locked = true WHERE id = t_ids[1];
        GET DIAGNOSTICS cnt = ROW_COUNT; n := n + cnt;
        IF array_length(t_ids, 1) >= 2 THEN
            UPDATE public.tasks SET start_date = r.d2, end_date = r.d2, shipping_date_locked = true WHERE id = t_ids[2];
            GET DIAGNOSTICS cnt = ROW_COUNT; n := n + cnt;
        END IF;
    ELSE
        UPDATE public.tasks SET start_date = r.d1, end_date = r.d1, shipping_date_locked = true
         WHERE project_number = r.project_number AND machine = r.machine_name AND text = '工場出荷';
        GET DIAGNOSTICS n = ROW_COUNT;
    END IF;

    RETURN n;
END;
$function$;

-- 元に戻すとき:
--   5) 上の関数の判定を「IF auth.uid() IS NULL OR public.is_contractor() THEN」に戻して実行する
--   1) ALTER POLICY ... WITH CHECK / USING (bucket_id = 'pending-item-photos') に戻す
--   2) DROP POLICY contractor_default_deny ON public.deliveries;
--   3) GRANT EXECUTE ON FUNCTION ...（上の関数） TO anon;  GRANT EXECUTE ON FUNCTION public.tr_log_assembly_task_delete_change_log() TO authenticated;
--   4) ALTER FUNCTION public.hook_before_user_created(jsonb) RESET search_path;
