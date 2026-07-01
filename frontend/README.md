# Task Manager — фронтенд

Веб-приложение для командного управления задачами. React + Vite + TypeScript + Tailwind,
бэкенд — Supabase (Postgres + Auth + Storage).

## Возможности

- Индивидуальные логины (email + пароль), задачи ставятся на конкретного участника
- Вид **Таблица** и вид **Kanban-доска** (drag-and-drop смены статуса) в отдельных вкладках
- Статусы: Новая / В работе / Готово; приоритеты; сроки
- Отчёт по задаче + вложения: Word/Excel/PPT/PDF/изображения/аудио (до 25 МБ)
- Запись голосовых сообщений прямо в браузере
- Комментарии к задачам
- Уведомления о сроках (колокольчик): просроченные и близкие задачи
- Переключатель светлой/тёмной темы

## Запуск локально

```bash
npm install
npm run dev
```

Откройте http://localhost:5173

## Настройки

Ключи Supabase лежат в `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_KEY=sb_publishable_...
```

Перед первым запуском в Supabase должна быть применена схема из
`../supabase/schema.sql` (SQL Editor → Run).

## Сборка для деплоя

```bash
npm run build   # результат в dist/
```

Деплой на Vercel: импортировать репозиторий, Root Directory = `Task_Manager/frontend`,
добавить переменные `VITE_SUPABASE_URL` и `VITE_SUPABASE_KEY` в настройках проекта.
