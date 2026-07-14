import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from './ui'

// Понятные сообщения вместо технических английских ошибок
function ruError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('not confirmed') || m.includes('not been confirmed'))
    return 'Email не подтверждён. Найдите письмо от Supabase (проверьте папку «Спам») и нажмите ссылку. Или отправьте письмо заново кнопкой ниже.'
  if (m.includes('invalid login')) return 'Неверный email или пароль.'
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Этот email уже зарегистрирован — просто войдите (или сбросьте пароль).'
  if (m.includes('password') && m.includes('6')) return 'Пароль должен быть не менее 6 символов.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Слишком много попыток. Подождите минуту и попробуйте снова.'
  return msg
}

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setNeedsConfirm(false)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        if (!fullName.trim()) throw new Error('Укажите имя')
        await signUp(email, password, fullName.trim())
        setInfo('Аккаунт создан! На вашу почту отправлено письмо со ссылкой — перейдите по ней (проверьте «Спам»), затем войдите.')
        setNeedsConfirm(true)
        setMode('signin')
      }
    } catch (err: any) {
      const raw = err.message ?? 'Ошибка'
      setError(ruError(raw))
      if (raw.toLowerCase().includes('not confirmed')) setNeedsConfirm(true)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!email) {
      setError('Впишите email, на который регистрировались.')
      return
    }
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setInfo('Письмо отправлено заново на ' + email + '. Проверьте почту и «Спам».')
    } catch (err: any) {
      setError(ruError(err.message ?? 'Не удалось отправить письмо'))
    } finally {
      setBusy(false)
    }
  }

  const field =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-neutral-700 dark:bg-neutral-900'

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            TM
          </div>
          <h1 className="text-xl font-semibold">Task Manager</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
            {mode === 'signin' ? 'Вход в систему' : 'Регистрация участника'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Имя и фамилия</label>
              <input
                className={field}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иван Петров"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Пароль</label>
            <input
              type="password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          {info && <p className="text-sm text-green-600 dark:text-green-400">{info}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Подождите…' : mode === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </Button>

          {(needsConfirm || mode === 'signin') && (
            <button
              type="button"
              onClick={resend}
              disabled={busy}
              className="w-full text-center text-xs text-gray-500 hover:text-brand hover:underline dark:text-neutral-400"
            >
              Не приходит письмо подтверждения? Отправить заново
            </button>
          )}
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-neutral-400">
          {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
          <button
            className="font-medium text-brand hover:underline"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setInfo(null)
            }}
          >
            {mode === 'signin' ? 'Создать' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  )
}
