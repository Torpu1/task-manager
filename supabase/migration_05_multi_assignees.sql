-- ============================================================
-- Миграция 05: несколько ответственных на задачу
-- ============================================================

create table if not exists public.task_assignees (
  task_id    uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, profile_id)
);

alter table public.task_assignees enable row level security;
drop policy if exists "task_assignees all" on public.task_assignees;
create policy "task_assignees all" on public.task_assignees
  for all to authenticated using (true) with check (true);

-- Перенос текущего единственного ответственного в новую таблицу
insert into public.task_assignees (task_id, profile_id)
  select id, assignee_id from public.tasks where assignee_id is not null
  on conflict do nothing;

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.task_assignees;
exception when others then null; end $$;

notify pgrst, 'reload schema';
