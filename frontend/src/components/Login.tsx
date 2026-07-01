import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        if (!fullName.trim()) throw new Error('Укажите имя')
        await signUp(email, password, fullName.trim())
        setInfo('Аккаунт создан. Если включено подтверждение почты — проверьте письмо, иначе войдите.')
        setMode('signin')
      }
    } catch (err: any) {
      setError(err.message ?? 'Ошибка')
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
