import { createClient } from '@supabase/supabase-js'

const supabaseUrlRaw = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrlRaw) {
  throw new Error('Missing VITE_SUPABASE_URL')
}

const rawTrim = String(supabaseUrlRaw).trim()
if (/\/rest\/v1/i.test(rawTrim)) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL no debe incluir /rest/v1. Usa solo la raíz del proyecto, por ejemplo:\n' +
      '  VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co\n' +
      'Si dejas /rest/v1 en la URL, el cliente apunta mal y aparecen errores tipo "failed to fetch" o CORS al consultar tablas.',
  )
}
if (/\/auth\/v1/i.test(rawTrim)) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL no debe incluir /auth/v1. Usa solo https://TU_PROJECT_REF.supabase.co',
  )
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY')
}

/**
 * Raíz del proyecto: sin /rest/v1 ni /auth/v1 (errores típicos al copiar la URL).
 * Si el navegador muestra ERR_NAME_NOT_RESOLVED, el subdominio no existe: copia de nuevo
 * "Project URL" en Supabase -> Settings -> API (solo https://XXXX.supabase.co).
 */
function normalizeSupabaseProjectUrl(url: string): string {
  let u = String(url).trim().replace(/\/+$/, '')
  if (/\/rest\/v1/i.test(u)) {
    u = u.replace(/\/rest\/v1.*$/i, '')
  }
  if (/\/auth\/v1/i.test(u)) {
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
    '[supabase] La anon key no parece la de Supabase (suele empezar por eyJ... o sb_publishable_...). Cópiala de Settings -> API.',
  )
}

export const supabase = createClient(supabaseUrl, key)