-- ============================================================
-- Миграция 02: раздел «Примечание» + привязка вложений к разделу
-- Применить в Supabase → SQL Editor → Run
-- ============================================================

-- Отдельное текстовое поле «Примечание» (в дополнение к report)
alter table public.tasks add column if not exists note text;

-- К какому разделу относится вложение: 'report' (отчёт) или 'note' (примечание)
alter table public.attachments add column if not exists section text not null default 'report';

alter table public.attachments drop constraint if exists attachments_section_check;
alter table public.attachments add constraint attachments_section_check
  check (section in ('report','note'));
