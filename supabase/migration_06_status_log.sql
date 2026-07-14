-- ============================================================
-- Миграция 06: журнал смены статуса (кто и когда перевёл задачу)
-- ============================================================

create table if not exists public.task_status_log (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  actor_id    uuid references public.profiles(id),
  from_status text,
  to_status   text,
  created_at  timestamptz not null default now()
);

alter table public.task_status_log enable row level security;
drop policy if exists "task_status_log read" on public.task_status_log;
create policy "task_status_log read" on public.task_status_log
  for select to authenticated using (true);
drop policy if exists "task_status_log insert" on public.task_status_log;
create policy "task_status_log insert" on public.task_status_log
  for insert to authenticated with check (true);

-- Триггер: при смене статуса пишем, кто это сделал (auth.uid())
create or replace function public.log_status_change()
returns trigger language plpgsql security definer as $$
begin
  if new.status is distinct from old.status then
    insert into public.task_status_log (task_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  return new;
end $$;

drop trigger if exists tasks_status_log on public.tasks;
create trigger tasks_status_log after update on public.tasks
  for each row execute function public.log_status_change();

do $$ begin
  alter publication supabase_realtime add table public.task_status_log;
exception when others then null; end $$;

notify pgrst, 'reload schema';
