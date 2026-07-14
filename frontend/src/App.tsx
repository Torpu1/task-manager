import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Login from './components/Login'
import TaskTable from './components/TaskTable'
import KanbanBoard from './components/KanbanBoard'
import TaskDialog from './components/TaskDialog'
import { Button } from './components/ui'
import { supabase } from './lib/supabase'
import { listProfiles, listTasks, updateTask } from './lib/api'
import { myUpcoming, dueState } from './lib/format'
import type { Profile, Task, TaskStatus } from './lib/types'

type Tab = 'table' | 'board'

export default function App() {
  const { session, profile, loading, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  const [tab, setTab] = useState<Tab>('table')
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [dialogTask, setDialogTask] = useState<Task | 'new' | null>(null)
  const [bellOpen, setBellOpen] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [fAssignee, setFAssignee] = useState('all')
  const [fStatus, setFStatus] = useState<'all' | TaskStatus | 'overdue'>('all')
  const [showArchived, setShowArchived] = useState(false)

  const refresh = useCallback(async () => {
    setDataLoading(true)
    // Грузим независимо: сбой одного запроса не должен обнулять другой
    const [tRes, pRes] = await Promise.allSettled([listTasks(), listProfiles()])
    if (tRes.status === 'fulfilled') setTasks(tRes.value)
    else console.error('Ошибка загрузки задач:', tRes.reason)
    if (pRes.status === 'fulfilled') setProfiles(pRes.value)
    else console.error('Ошибка загрузки профилей:', pRes.reason)
    setDataLoading(false)
  }, [])

  useEffect(() => {
    if (session) refresh()
  }, [session, refresh])

  // Живое обновление: слушаем изменения в БД и обновляем список у всех
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attachments' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignees' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_status_log' }, () => refresh())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, refresh])

  // «Взять в работу»: перевод задачи в статус in_progress (автор фиксируется триггером)
  const takeInWork = useCallback(
    async (t: Task) => {
      try {
        await updateTask(t.id, { status: 'in_progress' })
        refresh()
      } catch (e) {
        console.error(e)
      }
    },
    [refresh],
  )

  const upcoming = useMemo(
    () => myUpcoming(tasks, session?.user.id),
    [tasks, session],
  )

  // Активные (не в архиве) и счётчик архива
  const active = useMemo(() => tasks.filter((t) => !t.archived), [tasks])
  const archivedCount = tasks.length - active.length

  // Счётчики для дашборда (по активным задачам)
  const stats = useMemo(() => {
    const s = { total: active.length, new: 0, in_progress: 0, done: 0, overdue: 0 }
    for (const t of active) {
      s[t.status]++
      if (dueState(t) === 'overdue') s.overdue++
    }
    return s
  }, [active])

  // Отфильтрованный список для таблицы/доски
  const filtered = useMemo(() => {
    const base = showArchived ? tasks.filter((t) => t.archived) : active
    const q = search.trim().toLowerCase()
    return base.filter((t) => {
      if (fStatus === 'overdue') {
        if (dueState(t) !== 'overdue') return false
      } else if (fStatus !== 'all' && t.status !== fStatus) return false
      const ids = (t.assignees ?? []).map((a) => a.id)
      if (fAssignee === 'me') {
        if (!ids.includes(session?.user.id ?? '')) return false
      } else if (fAssignee !== 'all' && !ids.includes(fAssignee)) return false
      if (q && !`${t.title} ${t.description ?? ''}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, active, showArchived, search, fAssignee, fStatus, session])

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-gray-500">
        Загрузка…
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="min-h-full">
      {/* Шапка */}
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
              TM
            </div>
            <span className="hidden font-semibold sm:block">Task Manager</span>
          </div>

          {/* Вкладки */}
          <nav className="ml-2 flex rounded-lg bg-gray-100 p-0.5 dark:bg-neutral-900">
            <button
              onClick={() => setTab('table')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'table'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-neutral-400'
              }`}
            >
              Таблица
            </button>
            <button
              onClick={() => setTab('board')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'board'
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-neutral-400'
              }`}
            >
              Доска
            </button>
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Колокольчик */}
            <div className="relative">
              <button
                onClick={() => setBellOpen((v) => !v)}
                className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                title="Уведомления о сроках"
              >
                <BellIcon />
                {upcoming.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {upcoming.length}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="px-2 py-1 text-xs font-semibold uppercase text-gray-400">
                    Сроки по вашим задачам
                  </p>
                  {upcoming.length === 0 && (
                    <p className="px-2 py-3 text-sm text-gray-500">Нет срочных задач 🎉</p>
                  )}
                  {upcoming.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setDialogTask(t)
                        setBellOpen(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-800"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          dueState(t) === 'overdue' ? 'bg-red-500' : 'bg-yellow-400'
                        }`}
                      />
                      <span className="flex-1 truncate text-sm">{t.title}</span>
                      <span className="text-xs text-gray-400">
                        {dueState(t) === 'overdue' ? 'просрочено' : 'скоро'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Тема */}
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              title="Сменить тему"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Пользователь */}
            <div className="ml-1 hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold dark:bg-neutral-800">
                {(profile?.full_name ?? '?').slice(0, 1).toUpperCase()}
              </div>
              <span className="max-w-[120px] truncate text-sm">{profile?.full_name}</span>
            </div>
            <Button variant="ghost" onClick={signOut} title="Выйти">
              Выход
            </Button>
          </div>
        </div>
      </header>

      {/* Контент */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Дашборд-счётчики (клик — фильтр) */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StatCard label="Всего" value={stats.total} color="slate" active={fStatus === 'all'} onClick={() => setFStatus('all')} />
          <StatCard label="Новые" value={stats.new} color="gray" active={fStatus === 'new'} onClick={() => setFStatus('new')} />
          <StatCard label="В работе" value={stats.in_progress} color="blue" active={fStatus === 'in_progress'} onClick={() => setFStatus('in_progress')} />
          <StatCard label="Готово" value={stats.done} color="green" active={fStatus === 'done'} onClick={() => setFStatus('done')} />
          <StatCard label="Просрочено" value={stats.overdue} color="red" active={fStatus === 'overdue'} onClick={() => setFStatus('overdue')} />
        </div>

        {/* Панель фильтров */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Поиск по названию…"
            className="w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            value={fAssignee}
            onChange={(e) => setFAssignee(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="all">Все ответственные</option>
            <option value="me">Только мои</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
          <Button
            variant={showArchived ? 'primary' : 'ghost'}
            onClick={() => setShowArchived((v) => !v)}
            title="Показать/скрыть архив"
          >
            🗄 Архив{archivedCount ? ` (${archivedCount})` : ''}
          </Button>
          <Button onClick={() => setDialogTask('new')}>
            <PlusIcon /> Новая задача
          </Button>
        </div>

        <p className="mb-3 text-sm text-gray-500 dark:text-neutral-400">
          {dataLoading
            ? 'Обновление…'
            : showArchived
              ? `🗄 Архив: ${filtered.length}`
              : `Показано: ${filtered.length} из ${active.length}`}
        </p>

        {tab === 'table' ? (
          <TaskTable
            tasks={filtered}
            onOpen={setDialogTask}
            onTake={takeInWork}
            userId={session.user.id}
          />
        ) : (
          <KanbanBoard
            tasks={filtered}
            onOpen={setDialogTask}
            onChanged={refresh}
            onTake={takeInWork}
            userId={session.user.id}
          />
        )}
      </main>

      {dialogTask && (
        <TaskDialog
          task={dialogTask === 'new' ? null : dialogTask}
          profiles={profiles}
          onClose={() => setDialogTask(null)}
          onSaved={refresh}
        />
      )}
    </div>
  )
}

/* ---- Карточка-счётчик дашборда ---- */
function StatCard({
  label,
  value,
  color,
  active,
  onClick,
}: {
  label: string
  value: number
  color: 'slate' | 'gray' | 'blue' | 'green' | 'red'
  active?: boolean
  onClick?: () => void
}) {
  const val = {
    slate: 'text-gray-900 dark:text-white',
    gray: 'text-gray-600 dark:text-neutral-300',
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
  }[color]
  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-white p-3 text-left transition dark:bg-neutral-900 ${
        active ? 'ring-2 ring-brand' : 'ring-1 ring-gray-200 hover:ring-brand/50 dark:ring-neutral-800'
      }`}
    >
      <div className={`text-2xl font-bold ${val}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-neutral-400">{label}</div>
    </button>
  )
}

/* ---- Иконки (inline SVG, без зависимостей) ---- */
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
