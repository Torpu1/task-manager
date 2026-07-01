import { useState } from 'react'
import { PriorityBadge } from './ui'
import { formatDate, dueState } from '../lib/format'
import { updateTask } from '../lib/api'
import { STATUS_ORDER, STATUS_LABELS } from '../lib/types'
import type { Task, TaskStatus } from '../lib/types'

export default function KanbanBoard({
  tasks,
  onOpen,
  onChanged,
}: {
  tasks: Task[]
  onOpen: (t: Task) => void
  onChanged: () => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<TaskStatus | null>(null)

  const drop = async (status: TaskStatus) => {
    setOverCol(null)
    const id = dragId
    setDragId(null)
    if (!id) return
    const task = tasks.find((t) => t.id === id)
    if (!task || task.status === status) return
    try {
      await updateTask(id, { status })
      onChanged()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STATUS_ORDER.map((status) => {
        const items = tasks.filter((t) => t.status === status)
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(status)
            }}
            onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
            onDrop={() => drop(status)}
            className={`rounded-xl border p-3 transition-colors ${
              overCol === status
                ? 'border-brand bg-brand/5'
                : 'border-gray-200 bg-gray-50 dark:border-neutral-800 dark:bg-neutral-900/50'
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold">{STATUS_LABELS[status]}</h3>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                {items.length}
              </span>
            </div>

            <div className="space-y-2">
              {items.map((t) => {
                const ds = dueState(t)
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => onOpen(t)}
                    className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <PriorityBadge priority={t.priority} />
                      {t.due_date && (
                        <span
                          className={`text-xs ${
                            ds === 'overdue'
                              ? 'font-medium text-red-500'
                              : ds === 'soon'
                                ? 'font-medium text-yellow-600 dark:text-yellow-400'
                                : 'text-gray-400'
                          }`}
                        >
                          {formatDate(t.due_date)}
                        </span>
                      )}
                    </div>
                    {t.assignee && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                        👤 {t.assignee.full_name}
                      </div>
                    )}
                  </div>
                )
              })}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-xs text-gray-400 dark:border-neutral-800">
                  Перетащите задачу сюда
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
