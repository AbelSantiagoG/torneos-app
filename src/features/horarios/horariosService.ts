import { supabase } from '@/lib/supabase'
import type { HorarioRow } from '@/types/database'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

/** Acepta "08:00" o "08:00:00" para Postgres `time`. */
export function normalizeHoraDb(hora: string): string {
  const t = hora.trim()
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`
  return t
}

export function formatHoraUi(hora: string): string {
  if (!hora) return ''
  const parts = hora.split(':')
  if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
  return hora
}

export async function getHorarios(torneoId: string): Promise<HorarioRow[]> {
  const result = await supabase
    .from('horarios')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('hora', { ascending: true })
  return throwOnError(result) as HorarioRow[]
}

export type HorarioInput = {
  hora: string
  activo?: boolean
}

export async function createHorario(torneoId: string, data: HorarioInput): Promise<HorarioRow> {
  const result = await supabase
    .from('horarios')
    .insert({
      torneo_id: torneoId,
      hora: normalizeHoraDb(data.hora),
      activo: data.activo ?? true,
    })
    .select('*')
    .single()
  return throwOnError(result) as HorarioRow
}

export async function updateHorario(id: string, data: Partial<HorarioInput>): Promise<HorarioRow> {
  const patch: Record<string, unknown> = {}
  if (data.hora !== undefined) patch.hora = normalizeHoraDb(data.hora)
  if (data.activo !== undefined) patch.activo = data.activo

  const result = await supabase.from('horarios').update(patch).eq('id', id).select('*').single()
  return throwOnError(result) as HorarioRow
}

export async function deleteHorario(id: string): Promise<void> {
  const result = await supabase.from('horarios').delete().eq('id', id)
  if (result.error) {
    throw new Error(result.error.message)
  }
}
