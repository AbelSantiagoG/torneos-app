import { createClient } from '@supabase/supabase-js'

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrlRaw)
}

if (!supabaseUrlRaw) {
  throw new Error('Missing VITE_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY')
}

/**
 * Raíz del proyecto: sin /rest/v1 ni /auth/v1 (errores típicos al copiar la URL).
 * Si el navegador muestra ERR_NAME_NOT_RESOLVED, el subdominio no existe: copia de nuevo
 * "Project URL" en Supabase → Settings → API (solo https://XXXX.supabase.co).
 */
function normalizeSupabaseProjectUrl(url: string): string {
  let u = String(url).trim().replace(/\/+$/, '')
  if (/\/rest\/v1/i.test(u)) {
    console.warn('[supabase] VITE_SUPABASE_URL contenía /rest/v1; se usó solo la raíz del proyecto.')
    u = u.replace(/\/rest\/v1.*$/i, '')
  }
  if (/\/auth\/v1/i.test(u)) {
    console.warn('[supabase] VITE_SUPABASE_URL contenía /auth/v1; se usó solo la raíz del proyecto.')
    u = u.replace(/\/auth\/v1.*$/i, '')
  }
  return u.replace(/\/+$/, '')
}

function assertLooksLikeSupabaseProjectUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(
      'VITE_SUPABASE_URL no es una URL válida. Ejemplo: https://abcdefghijklmnop.supabase.co',
    )
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('VITE_SUPABASE_URL debe usar https://')
  }
  if (!parsed.hostname.endsWith('.supabase.co')) {
    console.warn(
      '[supabase] El host no termina en .supabase.co. Si es dominio propio, asegúrate de que el DNS sea correcto.',
    )
  }
}

const supabaseUrl = normalizeSupabaseProjectUrl(supabaseUrlRaw)
assertLooksLikeSupabaseProjectUrl(supabaseUrl)

const key = String(supabaseAnonKey).trim()
if (!key.startsWith('eyJ') && !key.startsWith('sb_publishable_')) {
  console.warn(
    '[supabase] La anon key no parece la de Supabase (suele empezar por eyJ… o sb_publishable_…). Cópiala de Settings → API.',
  )
}

export const supabase = createClient(supabaseUrl, key)
