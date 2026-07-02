import { StatusBadge, PriorityBadge, ProgressBar } from './ui'
import { formatDue, dueState } from '../lib/format'
import type { Task, Section } from '../lib/types'

/** Ячейка «Отчёт»/«Примечание»: показывает наличие текста и число вложений */
function SectionCell({ task, section }: { task: Task; section: Section }) {
  const hasText = section === 'report' ? !!task.report : !!task.note
  const count = (task.attachments ?? []).filter((a) => a.section === section).length
  if (!hasText && count === 0) {
    return <span className="text-gray-300 dark:text-neutral-700">—</span>
  }
  return (
    <span className="inline-flex items-center gap-2 text-gray-600 dark:text-neutral-300">
      {hasText && <span title="Есть текст">📝</span>}
      {count > 0 && (
        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800" title="Вложения">
          📎 {count}
        </span>
      )}
    </span>
  )
}

export default function TaskTable({
  tasks,
  onOpen,
}: {
  tasks: Task[]
  onOpen: (t: Task) => void
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-gray-500 dark:border-neutral-800">
        Пока нет задач. Нажмите «Новая задача», чтобы создать первую.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-neutral-800 dark:text-neutral-400">
            <th className="px-4 py-3 font-medium">Задача</th>
            <th className="px-4 py-3 font-medium">Ответственный</th>
            <th className="px-4 py-3 font-medium">Статус</th>
            <th className="px-4 py-3 font-medium">Приоритет</th>
            <th className="px-4 py-3 font-medium">Срок</th>
            <th className="px-4 py-3 font-medium">Отчёт</th>
            <th className="px-4 py-3 font-medium">Примечание</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const ds = dueState(t)
            return (
              <tr
                key={t.id}
                onClick={() => onOpen(t)}
                className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{t.title}</div>
                  {t.description && (
                    <div className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-neutral-400">
                      {t.description}
                    </div>
                  )}
                  {t.progress > 0 && <ProgressBar value={t.progress} className="mt-1.5" />}
                </td>
                <td className="px-4 py-3 text-gray-700 dark:text-neutral-300">
                  {t.assignee?.full_name ?? <span className="text-gray-400">не назначен</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      ds === 'overdue'
                        ? 'font-medium text-red-600 dark:text-red-400'
                        : ds === 'soon'
                          ? 'font-medium text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-600 dark:text-neutral-300'
                    }
                  >
                    {formatDue(t.due_date)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SectionCell task={t} section="report" />
                </td>
                <td className="px-4 py-3">
                  <SectionCell task={t} section="note" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
