-- セキュリティ診断 低（2026-10-14）
-- 参照するスキーマ（search_path）が固定されていない関数に、空の search_path を設定する。
-- 3つとも「更新日時を now() にする」だけのトリガー関数で、now() は常に参照できるため動作は変わらない。

ALTER FUNCTION public.task_shipment_overlays_set_updated_at() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_updated_at() SET search_path = '';
