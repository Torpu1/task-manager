-- ============================================================
-- Task Manager — схема базы данных (Supabase / PostgreSQL)
-- Применить в Supabase → SQL Editor → New query → Run
-- ============================================================

-- Расширения
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ПРОФИЛИ ПОЛЬЗОВАТЕЛЕЙ
-- Supabase Auth хранит вход (email+пароль) в auth.users.
-- Здесь — публичное имя, по которому ставятся задачи.
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'member',   -- на старте у всех одинаково; задел на будущее
  created_at  timestamptz not null default now()
);

-- Автосоздание профиля при регистрации пользователя
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- ЗАДАЧИ
-- ------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text not null default 'new'      -- new | in_progress | done
                  check (status in ('new','in_progress','done')),
  priority      text not null default 'normal'   -- low | normal | high
                  check (priority in ('low','normal','high')),
  assignee_id   uuid references public.profiles(id) on delete set null,  -- ответственный
  creator_id    uuid not null references public.profiles(id),            -- постановщик
  due_date      timestamptz,                     -- срок
  report        text,                            -- текст отчёта
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_status_idx   on public.tasks(status);
create index tasks_due_idx      on public.tasks(due_date);

-- авто-обновление updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- КОММЕНТАРИИ (тред под задачей)
-- ------------------------------------------------------------
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  author_id   uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index comments_task_idx on public.comments(task_id);

-- ------------------------------------------------------------
-- ВЛОЖЕНИЯ (Word/Excel/PPT + голосовые)
-- Сам файл лежит в Supabase Storage; здесь — метаданные и путь.
-- ------------------------------------------------------------
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks(id) on delete cascade,
  uploader_id  uuid not null references public.profiles(id),
  file_name    text not null,
  storage_path text not null,                    -- путь в бакете 'attachments'
  mime_type    text,                             -- напр. audio/webm, application/vnd...
  kind         text not null default 'file'      -- file | voice
                 check (kind in ('file','voice')),
  size_bytes   bigint,                           -- лимит на клиенте: 25 МБ
  created_at   timestamptz not null default now()
);
create index attachments_task_idx on public.attachments(task_id);

-- ------------------------------------------------------------
-- УВЕДОМЛЕНИЯ (внутри приложения, колокольчик)
-- ------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  task_id     uuid references public.tasks(id) on delete cascade,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, is_read);

-- ============================================================
-- ROW LEVEL SECURITY
-- На старте: любой залогиненный участник видит и меняет всё
-- (права одинаковые). Разграничение — позже, правкой политик.
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.tasks         enable row level security;
alter table public.comments      enable row level security;
alter table public.attachments   enable row level security;
alter table public.notifications enable row level security;

-- Профили: читают все аутентифицированные; менять — только свой
create policy "profiles read"  on public.profiles for select to authenticated using (true);
create policy "profiles update self" on public.profiles for update to authenticated using (auth.uid() = id);

-- Задачи / комментарии / вложения: полный доступ аутентифицированным
create policy "tasks all"       on public.tasks       for all to authenticated using (true) with check (true);
create policy "comments all"    on public.comments    for all to authenticated using (true) with check (true);
create policy "attachments all" on public.attachments for all to authenticated using (true) with check (true);

-- Уведомления: пользователь видит и меняет только свои
create policy "notif own" on public.notifications for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- STORAGE
-- Бакет для вложений создать в Supabase → Storage → New bucket:
--   name: attachments   (private)
-- Затем политики доступа (SQL ниже) для аутентифицированных.
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', false)
  on conflict (id) do nothing;

create policy "attachments storage read"  on storage.objects for select to authenticated
  using (bucket_id = 'attachments');
create policy "attachments storage write" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');
create policy "attachments storage del"   on storage.objects for delete to authenticated
  using (bucket_id = 'attachments');
