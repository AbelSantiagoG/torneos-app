import { createClient } from '@supabase/supabase-js'

function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(
      `Variable de entorno faltante o vacía: ${String(name)}. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env`,
    )
  }
  return value.trim()
}

const url = requireEnv('VITE_SUPABASE_URL')
const anonKey = requireEnv('VITE_SUPABASE_ANON_KEY')

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
