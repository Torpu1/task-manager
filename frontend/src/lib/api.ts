import { supabase } from './supabase'
import type { Task, Profile, Comment, Attachment, TaskStatus, Section } from './types'

// ---------- Профили ----------
export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .order('full_name')
  if (error) throw error
  return data ?? []
}

// ---------- Задачи ----------
const TASK_SELECT =
  '*, assignee:profiles!tasks_assignee_id_fkey(id, full_name, role), creator:profiles!tasks_creator_id_fkey(id, full_name, role), attachments(id, section)'

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as Task[]) ?? []
}

export interface TaskInput {
  title: string
  description?: string | null
  status: TaskStatus
  priority: Task['priority']
  assignee_id: string | null
  due_date: string | null
  report?: string | null
  note?: string | null
  progress?: number
  archived?: boolean
}

export async function createTask(input: TaskInput, creatorId: string): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, creator_id: creatorId })
    .select(TASK_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Task
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select(TASK_SELECT)
    .single()
  if (error) throw error
  return data as unknown as Task
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ---------- Комментарии ----------
export async function listComments(taskId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, author:profiles!comments_author_id_fkey(id, full_name, role)')
    .eq('task_id', taskId)
    .order('created_at')
  if (error) throw error
  return (data as unknown as Comment[]) ?? []
}

export async function addComment(taskId: string, authorId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .insert({ task_id: taskId, author_id: authorId, body })
  if (error) throw error
}

// ---------- Вложения ----------
export async function listAttachments(taskId: string, section: Section): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*, uploader:profiles!attachments_uploader_id_fkey(id, full_name, role)')
    .eq('task_id', taskId)
    .eq('section', section)
    .order('created_at')
  if (error) throw error
  return (data as unknown as Attachment[]) ?? []
}

export async function uploadAttachment(
  taskId: string,
  uploaderId: string,
  file: Blob,
  fileName: string,
  kind: 'file' | 'voice',
  section: Section,
): Promise<void> {
  const path = `${taskId}/${crypto.randomUUID()}-${fileName}`
  const { error: upErr } = await supabase.storage
    .from('attachments')
    .upload(path, file, { contentType: file.type || undefined })
  if (upErr) throw upErr

  const { error } = await supabase.from('attachments').insert({
    task_id: taskId,
    uploader_id: uploaderId,
    file_name: fileName,
    storage_path: path,
    mime_type: file.type || null,
    kind,
    section,
    size_bytes: (file as File).size ?? null,
  })
  if (error) throw error
}

export async function getAttachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, 60 * 60) // ссылка на 1 час
  if (error) throw error
  return data.signedUrl
}

export async function deleteAttachment(att: Attachment): Promise<void> {
  await supabase.storage.from('attachments').remove([att.storage_path])
  const { error } = await supabase.from('attachments').delete().eq('id', att.id)
  if (error) throw error
}
