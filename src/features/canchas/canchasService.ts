import { supabase } from '@/lib/supabase'
import type { CanchaRow } from '@/types/database'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

export async function getCanchas(torneoId: string): Promise<CanchaRow[]> {
  const result = await supabase
    .from('canchas')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('nombre', { ascending: true })
  return throwOnError(result) as CanchaRow[]
}

export type CanchaInput = {
  nombre: string
  ubicacion?: string | null
  activa?: boolean
}

export async function createCancha(torneoId: string, data: CanchaInput): Promise<CanchaRow> {
  const result = await supabase
    .from('canchas')
    .insert({
      torneo_id: torneoId,
      nombre: data.nombre,
      ubicacion: data.ubicacion ?? null,
      activa: data.activa ?? true,
    })
    .select('*')
    .single()
  return throwOnError(result) as CanchaRow
}

export async function updateCancha(id: string, data: Partial<CanchaInput>): Promise<CanchaRow> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.ubicacion !== undefined) patch.ubicacion = data.ubicacion
  if (data.activa !== undefined) patch.activa = data.activa

  const result = await supabase.from('canchas').update(patch).eq('id', id).select('*').single()
  return throwOnError(result) as CanchaRow
}

export async function deleteCancha(id: string): Promise<void> {
  const result = await supabase.from('canchas').delete().eq('id', id)
  if (result.error) {
    throw new Error(result.error.message)
  }
}
