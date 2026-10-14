-- 検査・会議を共有メールボックスの予定表に作成したときの Graph のイベントID（2026-10-14 適用済み）
alter table public.approval_requests add column if not exists calendar_event_id text;
comment on column public.approval_requests.calendar_event_id is '検査・会議を共有メールボックスの予定表に作成したときのGraphのイベントID。nullは旧方式（Gmail・.ics添付）で案内した会議、または未案内';
