import type { TaskStatus, Priority } from '../lib/types'
import { STATUS_LABELS, PRIORITY_LABELS } from '../lib/types'

export function StatusBadge({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    new: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    done: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    low: 'text-gray-500 dark:text-neutral-400',
    normal: 'text-gray-700 dark:text-neutral-300',
    high: 'text-red-600 dark:text-red-400 font-semibold',
  }
  const dot: Record<Priority, string> = {
    low: 'bg-gray-400',
    normal: 'bg-yellow-400',
    high: 'bg-red-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${map[priority]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot[priority]}`} />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const styles = {
    primary: 'bg-brand text-white hover:bg-brand-hover',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
