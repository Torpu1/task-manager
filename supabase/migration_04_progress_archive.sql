-- ============================================================
-- Миграция 04: прогресс выполнения (%) и архив задач
-- ============================================================

alter table public.tasks add column if not exists progress int not null default 0;
alter table public.tasks add column if not exists archived boolean not null default false;

alter table public.tasks drop constraint if exists tasks_progress_chk;
alter table public.tasks add constraint tasks_progress_chk check (progress between 0 and 100);

notify pgrst, 'reload schema';
