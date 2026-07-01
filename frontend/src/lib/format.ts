import type { Task } from './types'

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Статус срока: overdue — просрочено, soon — <24ч, ok — норм, none — без срока */
export function dueState(task: Task): 'overdue' | 'soon' | 'ok' | 'none' {
  if (!task.due_date || task.status === 'done') return task.due_date ? 'ok' : 'none'
  const due = new Date(task.due_date).getTime()
  const now = Date.now()
  if (due < now) return 'overdue'
  if (due - now < 24 * 60 * 60 * 1000) return 'soon'
  return 'ok'
}

/** Задачи для «колокольчика»: назначенные мне, просроченные или на подходе */
export function myUpcoming(tasks: Task[], userId: string | undefined): Task[] {
  if (!userId) return []
  return tasks.filter(
    (t) => t.assignee_id === userId && (dueState(t) === 'overdue' || dueState(t) === 'soon'),
  )
}
