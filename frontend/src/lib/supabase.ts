import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_KEY as string

if (!url || !key) {
  // Подсказка при отсутствии .env
  console.error('Нет VITE_SUPABASE_URL / VITE_SUPABASE_KEY. Проверьте файл .env')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
})
