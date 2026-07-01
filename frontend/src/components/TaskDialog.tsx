import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui'
import {
  createTask,
  updateTask,
  deleteTask,
  listComments,
  addComment,
  listAttachments,
  uploadAttachment,
  getAttachmentUrl,
  deleteAttachment,
  type TaskInput,
} from '../lib/api'
import { formatDateTime } from '../lib/format'
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_ORDER } from '../lib/types'
import type { Task, Profile, Comment, Attachment, TaskStatus, Priority, Section } from '../lib/types'

const MAX_FILE_MB = 25

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function TaskDialog({
  task,
  profiles,
  onClose,
  onSaved,
}: {
  task: Task | null
  profiles: Profile[]
  onClose: () => void
  onSaved: () => void
}) {
  const { session } = useAuth()
  const userId = session!.user.id
  const isNew = !task

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'new')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'normal')
  const [assignee, setAssignee] = useState<string>(task?.assignee_id ?? '')
  const [due, setDue] = useState<string>(toLocalInput(task?.due_date ?? null))
  const [report, setReport] = useState(task?.report ?? '')
  const [note, setNote] = useState(task?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setError(null)
    if (!title.trim()) {
      setError('Введите название задачи')
      return
    }
    setBusy(true)
    try {
      const input: TaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assignee_id: assignee || null,
        due_date: due ? new Date(due).toISOString() : null,
        report: report.trim() || null,
        note: note.trim() || null,
      }
      if (isNew) await createTask(input, userId)
      else await updateTask(task!.id, input)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!task) return
    if (!confirm('Удалить задачу без возможности восстановления?')) return
    setBusy(true)
    try {
      await deleteTask(task.id)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Ошибка удаления')
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-neutral-700 dark:bg-neutral-900'
  const label = 'mb-1 block text-xs font-semibold uppercase text-gray-500 dark:text-neutral-400'

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-neutral-800">
          <h2 className="text-base font-semibold">{isNew ? 'Новая задача' : 'Задача'}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className={label}>Название</label>
            <input
              className={`${field} ${!isNew ? 'cursor-not-allowed bg-gray-50 opacity-70 dark:bg-neutral-900' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать"
              autoFocus={isNew}
              readOnly={!isNew}
              title={!isNew ? 'Название задачи нельзя изменить' : undefined}
            />
            {!isNew && (
              <p className="mt-1 text-xs text-gray-400">
                🔒 Название закреплено — при внесении отчёта его изменить нельзя.
              </p>
            )}
          </div>

          <div>
            <label className={label}>Описание</label>
            <textarea
              className={field}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Детали задачи"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={label}>Статус</label>
              <select className={field} value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Приоритет</label>
              <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                {(['low', 'normal', 'high'] as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Ответственный</label>
              <select className={field} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">— не назначен —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Срок</label>
              <input
                type="datetime-local"
                className={field}
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>

          {/* ---- Отчёт ---- */}
          <div className="rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
            <label className={label}>Отчёт</label>
            <textarea
              className={field}
              rows={3}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Текст отчёта по задаче"
            />
            {task ? (
              <div className="mt-3">
                <Attachments taskId={task.id} userId={userId} section="report" />
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                Файлы и голосовые к отчёту можно добавить после создания задачи.
              </p>
            )}
          </div>

          {/* ---- Примечание ---- */}
          <div className="rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
            <label className={label}>Примечание</label>
            <textarea
              className={field}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Дополнительная заметка"
            />
            {task ? (
              <div className="mt-3">
                <Attachments taskId={task.id} userId={userId} section="note" />
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                Файлы и голосовые к примечанию можно добавить после создания задачи.
              </p>
            )}
          </div>

          {task && <Comments taskId={task.id} userId={userId} />}

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4 dark:border-neutral-800">
          {task ? (
            <Button variant="danger" onClick={remove} disabled={busy}>
              Удалить
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Отмена
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Вложения (файлы + голос) ---------------- */
function Attachments({
  taskId,
  userId,
  section,
}: {
  taskId: string
  userId: string
  section: Section
}) {
  const [items, setItems] = useState<Attachment[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // запись голоса
  const [recording, setRecording] = useState(false)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const load = () => listAttachments(taskId, section).then(setItems).catch((e) => setErr(e.message))
  useEffect(() => {
    load()
  }, [taskId, section])

  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setErr(null)
    setBusy(true)
    try {
      for (const f of Array.from(files)) {
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          setErr(`Файл «${f.name}» больше ${MAX_FILE_MB} МБ`)
          continue
        }
        await uploadAttachment(taskId, userId, f, f.name, 'file', section)
      }
      await load()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const startRec = async () => {
    setErr(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setBusy(true)
        try {
          const name = `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`
          await uploadAttachment(taskId, userId, blob, name, 'voice', section)
          await load()
        } catch (e: any) {
          setErr(e.message)
        } finally {
          setBusy(false)
        }
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
    } catch (e: any) {
      setErr('Нет доступа к микрофону: ' + e.message)
    }
  }

  const stopRec = () => {
    recRef.current?.stop()
    setRecording(false)
  }

  const open = async (att: Attachment) => {
    try {
      const url = await getAttachmentUrl(att.storage_path)
      window.open(url, '_blank')
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const del = async (att: Attachment) => {
    if (!confirm('Удалить вложение?')) return
    try {
      await deleteAttachment(att)
      await load()
    } catch (e: any) {
      setErr(e.message)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-neutral-400">
          Вложения
        </span>
        <div className="ml-auto flex gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,audio/*,image/*"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            📎 Файл
          </Button>
          {recording ? (
            <Button variant="danger" onClick={stopRec}>
              ⏹ Стоп ({/* индикатор */}запись…)
            </Button>
          ) : (
            <Button variant="ghost" onClick={startRec} disabled={busy}>
              🎤 Голос
            </Button>
          )}
        </div>
      </div>

      <p className="mb-2 text-[11px] text-gray-400">
        Word, Excel, презентации, PDF, изображения, аудио. До {MAX_FILE_MB} МБ на файл.
      </p>

      <div className="space-y-1.5">
        {items.length === 0 && <p className="text-sm text-gray-400">Пока нет вложений.</p>}
        {items.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-neutral-900"
          >
            <span>{a.kind === 'voice' ? '🎧' : '📄'}</span>
            <button onClick={() => open(a)} className="flex-1 truncate text-left hover:text-brand hover:underline">
              {a.file_name}
            </button>
            {a.size_bytes != null && (
              <span className="text-xs text-gray-400">{(a.size_bytes / 1024 / 1024).toFixed(1)} МБ</span>
            )}
            <button onClick={() => del(a)} className="text-gray-400 hover:text-red-500" title="Удалить">
              ✕
            </button>
          </div>
        ))}
      </div>

      {err && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>}
    </div>
  )
}

/* ---------------- Комментарии ---------------- */
function Comments({ taskId, userId }: { taskId: string; userId: string }) {
  const [items, setItems] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => listComments(taskId).then(setItems).catch(console.error)
  useEffect(() => {
    load()
  }, [taskId])

  const send = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      await addComment(taskId, userId, text.trim())
      setText('')
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-neutral-800">
      <span className="text-xs font-semibold uppercase text-gray-500 dark:text-neutral-400">
        Комментарии
      </span>
      <div className="my-2 space-y-2">
        {items.length === 0 && <p className="text-sm text-gray-400">Обсуждения ещё нет.</p>}
        {items.map((c) => (
          <div key={c.id} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-neutral-900">
            <div className="mb-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-neutral-400">
              <span className="font-medium text-gray-700 dark:text-neutral-300">
                {c.author?.full_name ?? 'Участник'}
              </span>
              <span>{formatDateTime(c.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-neutral-700 dark:bg-neutral-900"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Написать комментарий…"
        />
        <Button onClick={send} disabled={busy || !text.trim()}>
          Отправить
        </Button>
      </div>
    </div>
  )
}
