import { supabase } from '@/lib/supabase'
import type { TorneoRow } from '@/types/database'

const STORAGE_KEY = 'torneo_activo_id'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

export async function getTorneos(): Promise<TorneoRow[]> {
  const result = await supabase.from('torneos').select('*').order('created_at', { ascending: true })
  return throwOnError(result) as TorneoRow[]
}

export async function getTorneoById(id: string): Promise<TorneoRow | null> {
  const result = await supabase.from('torneos').select('*').eq('id', id).maybeSingle()
  const row = throwOnError(result) as TorneoRow | null
  return row
}

export async function getTorneoActivo(): Promise<TorneoRow | null> {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (stored) {
    const byStored = await getTorneoById(stored)
    if (byStored && byStored.estado === 'activo') {
      return byStored
    }
  }

  const result = await supabase
    .from('torneos')
    .select('*')
    .eq('estado', 'activo')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const row = throwOnError(result) as TorneoRow | null
  if (row && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, row.id)
  }
  return row
}

export function clearTorneoActivoStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export type TorneoUpdateInput = Partial<
  Pick<TorneoRow, 'nombre' | 'organizacion' | 'descripcion' | 'fecha_inicio' | 'fecha_fin' | 'logo_url'>
>

export async function updateTorneo(id: string, data: TorneoUpdateInput): Promise<TorneoRow> {
  const result = await supabase.from('torneos').update(data).eq('id', id).select('*').single()
  return throwOnError(result) as TorneoRow
}
