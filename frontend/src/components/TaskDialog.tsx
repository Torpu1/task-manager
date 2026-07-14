import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button, ProgressBar } from './ui'
import {
  createTask,
  updateTask,
  deleteTask,
  setAssignees,
  listComments,
  addComment,
  listAttachments,
  uploadAttachment,
  getAttachmentUrl,
  deleteAttachment,
  type TaskInput,
} from '../lib/api'
import { formatDateTime, dueState } from '../lib/format'
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
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task?.assignees?.map((a) => a.id) ?? [],
  )
  const toggleAssignee = (id: string) =>
    setAssigneeIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const [due, setDue] = useState<string>(toLocalInput(task?.due_date ?? null))
  const [report, setReport] = useState(task?.report ?? '')
  const [note, setNote] = useState(task?.note ?? '')
  const [progress, setProgress] = useState<number>(task?.progress ?? 0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Синхронизация статуса и прогресса
  const applyStatus = (s: TaskStatus) => {
    setStatus(s)
    if (s === 'done') setProgress(100)
    else if (s === 'new') setProgress(0)
  }
  const applyProgress = (p: number) => {
    setProgress(p)
    if (p >= 100) setStatus('done')
    else if (p <= 0) setStatus('new')
    else setStatus('in_progress')
  }

  const buildInput = (): TaskInput => ({
    title: title.trim(),
    description: description.trim() || null,
    status,
    priority,
    due_date: due ? new Date(due).toISOString() : null,
    report: report.trim() || null,
    note: note.trim() || null,
    progress,
  })

  const save = async () => {
    setError(null)
    if (!title.trim()) {
      setError('Введите название задачи')
      return
    }
    setBusy(true)
    try {
      const t = isNew ? await createTask(buildInput(), userId) : await updateTask(task!.id, buildInput())
      await setAssignees(t.id, assigneeIds)
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Ошибка сохранения')
    } finally {
      setBusy(false)
    }
  }

  // Быстрые действия (сохраняют текущую форму + патч)
  const quick = async (patch: Partial<TaskInput>) => {
    if (!task) return
    setBusy(true)
    try {
      await updateTask(task.id, { ...buildInput(), ...patch })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Ошибка')
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>Статус</label>
              <select className={field} value={status} onChange={(e) => applyStatus(e.target.value as TaskStatus)}>
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
              <label className={label}>Срок</label>
              <input
                type="datetime-local"
                className={field}
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>

          {/* ---- Ответственные (несколько) ---- */}
          <div>
            <label className={label}>Ответственные</label>
            {profiles.length === 0 ? (
              <p className="text-sm text-gray-400">Нет зарегистрированных участников.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profiles.map((p) => {
                  const on = assigneeIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleAssignee(p.id)}
                      className={`rounded-full border px-3 py-1 text-sm transition ${
                        on
                          ? 'border-brand bg-brand text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-brand/60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                      }`}
                    >
                      {on ? '✓ ' : ''}
                      {p.full_name}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="mt-1 text-[11px] text-gray-400">Нажмите на имена — можно выбрать нескольких.</p>
          </div>

          {task?.statusActor && (
            <p className="text-xs text-blue-600 dark:text-blue-400">
              🔄 Текущий статус установил: <b>{task.statusActor.name}</b> ·{' '}
              {formatDateTime(task.statusActor.at)}
            </p>
          )}

          {task && status === 'new' && (
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                if (window.confirm('Взять эту задачу в работу?')) quick({ status: 'in_progress' })
              }}
              disabled={busy}
            >
              ▶ Взять в работу
            </Button>
          )}

          {/* ---- Прогресс выполнения ---- */}
          <div>
            <label className={label}>Прогресс выполнения</label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex gap-1.5">
                {[0, 25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => applyProgress(p)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      progress === p
                        ? 'bg-brand text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <ProgressBar value={progress} className="flex-1" />
            </div>
            {progress >= 100 && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                ✓ Выполнено на 100% — статус автоматически «Готово».
              </p>
            )}
          </div>

          {/* ---- Срок истёк: действия ---- */}
          {task && dueState(task) === 'overdue' && status !== 'done' && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
              <p className="font-medium text-red-700 dark:text-red-300">
                ⏰ Срок истёк: {formatDateTime(task.due_date!)}
              </p>
              <p className="mb-3 mt-0.5 text-xs text-red-600/90 dark:text-red-300/80">
                Продлите срок выше, закройте задачу как выполненную или уберите в архив.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={() => quick({ status: 'done', progress: 100 })}
                  disabled={busy}
                >
                  ✅ Закрыть (выполнено)
                </Button>
                <Button
                  variant="ghost"
                  className="!px-3 !py-1.5 !text-xs"
                  onClick={() => quick({ archived: true })}
                  disabled={busy}
                >
                  🗄 В архив
                </Button>
              </div>
            </div>
          )}

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
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" onClick={remove} disabled={busy}>
                Удалить
              </Button>
              {task.archived ? (
                <Button variant="ghost" onClick={() => quick({ archived: false })} disabled={busy}>
                  ↩ Из архива
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => quick({ archived: true })} disabled={busy}>
                  🗄 В архив
                </Button>
              )}
            </div>
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
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // запись голоса
  const [recording, setRecording] = useState(false)
  const [recSecs, setRecSecs] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  const load = async () => {
    try {
      const list = await listAttachments(taskId, section)
      setItems(list)
      // подгружаем ссылки для аудио, чтобы играть прямо в окне
      const audio = list.filter((a) => a.kind === 'voice' || (a.mime_type ?? '').startsWith('audio'))
      const map: Record<string, string> = {}
      await Promise.all(
        audio.map(async (a) => {
          try {
            map[a.id] = await getAttachmentUrl(a.storage_path)
          } catch {
            /* пропускаем */
          }
        }),
      )
      setUrls(map)
    } catch (e: any) {
      setErr(e.message)
    }
  }
  useEffect(() => {
    load()
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
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
    if (!navigator.mediaDevices?.getUserMedia) {
      setErr('Браузер не поддерживает запись звука. Откройте сайт в Chrome по https://')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // формат под браузер: Chrome — webm, Safari — mp4
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (timerRef.current) window.clearInterval(timerRef.current)
        const type = rec.mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : 'webm'
        const blob = new Blob(chunksRef.current, { type })
        if (blob.size === 0) {
          setErr('Запись пустая — попробуйте ещё раз и говорите дольше секунды.')
          return
        }
        setBusy(true)
        try {
          const name = `voice-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`
          await uploadAttachment(taskId, userId, blob, name, 'voice', section)
          await load()
        } catch (e: any) {
          setErr('Не удалось сохранить голосовое: ' + e.message)
        } finally {
          setBusy(false)
        }
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
      setRecSecs(0)
      timerRef.current = window.setInterval(() => setRecSecs((s) => s + 1), 1000)
    } catch (e: any) {
      setErr('Нет доступа к микрофону. Разрешите доступ в браузере. (' + e.message + ')')
    }
  }

  const stopRec = () => {
    recRef.current?.stop()
    setRecording(false)
  }

  const openFile = async (att: Attachment) => {
    try {
      const url = await getAttachmentUrl(att.storage_path)
      window.open(url, '_blank')
    } catch (e: any) {
      setErr(e.message)
    }
  }

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

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
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,audio/*,image/*"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          variant="ghost"
          className="!px-2.5 !py-1 !text-xs"
          onClick={() => fileRef.current?.click()}
          disabled={busy || recording}
        >
          📎 Файл
        </Button>
        {recording ? (
          <Button variant="danger" className="!px-2.5 !py-1 !text-xs" onClick={stopRec}>
            ⏹ Стоп · {mmss(recSecs)}
          </Button>
        ) : (
          <Button variant="ghost" className="!px-2.5 !py-1 !text-xs" onClick={startRec} disabled={busy}>
            🎤 Голос
          </Button>
        )}
        {recording && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> запись…
          </span>
        )}
        <span className="ml-auto text-[11px] text-gray-400">до {MAX_FILE_MB} МБ</span>
      </div>

      <div className="space-y-1.5">
        {items.map((a) => {
          const isAudio = a.kind === 'voice' || (a.mime_type ?? '').startsWith('audio')
          return (
            <div key={a.id} className="rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <span>{a.kind === 'voice' ? '🎧' : '📄'}</span>
                {isAudio ? (
                  <span className="flex-1 truncate">{a.file_name}</span>
                ) : (
                  <button
                    onClick={() => openFile(a)}
                    className="flex-1 truncate text-left hover:text-brand hover:underline"
                  >
                    {a.file_name}
                  </button>
                )}
                {a.size_bytes != null && (
                  <span className="text-xs text-gray-400">
                    {(a.size_bytes / 1024 / 1024).toFixed(1)} МБ
                  </span>
                )}
                <button onClick={() => del(a)} className="text-gray-400 hover:text-red-500" title="Удалить">
                  ✕
                </button>
              </div>
              <p className="mt-0.5 pl-6 text-[11px] text-gray-400">
                {a.kind === 'voice' ? '🎤 записал' : '📎 загрузил'}: {a.uploader?.full_name ?? '—'} ·{' '}
                {formatDateTime(a.created_at)}
              </p>
              {isAudio &&
                (urls[a.id] ? (
                  <audio controls src={urls[a.id]} className="mt-2 w-full" />
                ) : (
                  <p className="mt-1 text-xs text-gray-400">Загрузка плеера…</p>
                ))}
            </div>
          )
        })}
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
