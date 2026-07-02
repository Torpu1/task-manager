export type TaskStatus = 'new' | 'in_progress' | 'done'
export type Priority = 'low' | 'normal' | 'high'

export interface Profile {
  id: string
  full_name: string
  role: string
}

export type Section = 'report' | 'note'

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: Priority
  assignee_id: string | null
  creator_id: string
  due_date: string | null
  report: string | null
  note: string | null
  progress: number
  archived: boolean
  created_at: string
  updated_at: string
  assignee?: Profile | null
  creator?: Profile | null
  attachments?: { id: string; section: Section }[]
}

export interface Comment {
  id: string
  task_id: string
  author_id: string
  body: string
  created_at: string
  author?: Profile | null
}

export interface Attachment {
  id: string
  task_id: string
  uploader_id: string
  file_name: string
  storage_path: string
  mime_type: string | null
  kind: 'file' | 'voice'
  section: Section
  size_bytes: number | null
  created_at: string
  uploader?: Profile | null
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Готово',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Низкий',
  normal: 'Обычный',
  high: 'Высокий',
}

export const STATUS_ORDER: TaskStatus[] = ['new', 'in_progress', 'done']
