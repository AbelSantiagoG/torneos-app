import { supabase } from '@/lib/supabase'
import type { EquipoRow } from '@/types/database'
import { mapEquipoRow, type Equipo } from '@/types/torneo'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

async function countJugadoresActivosPorEquipo(equipoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (equipoIds.length === 0) return map
  const result = await supabase
    .from('jugador_equipos')
    .select('equipo_id')
    .in('equipo_id', equipoIds)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = throwOnError(result) as { equipo_id: string }[]
  for (const r of rows) {
    map.set(r.equipo_id, (map.get(r.equipo_id) ?? 0) + 1)
  }
  return map
}

export async function getEquiposByCategoria(categoriaId: string): Promise<Equipo[]> {
  const result = await supabase
    .from('equipos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('nombre', { ascending: true })

  const rows = throwOnError(result) as EquipoRow[]
  const ids = rows.map((r) => r.id)
  const counts = await countJugadoresActivosPorEquipo(ids)
  return rows.map((row) => mapEquipoRow(row, counts.get(row.id) ?? 0))
}

export type EquipoInput = {
  nombre: string
  sigla?: string | null
  color?: string | null
  logo_url?: string | null
  observaciones?: string | null
}

export async function createEquipo(
  torneoId: string,
  categoriaId: string,
  data: EquipoInput,
): Promise<EquipoRow> {
  const result = await supabase
    .from('equipos')
    .insert({
      torneo_id: torneoId,
      categoria_id: categoriaId,
      nombre: data.nombre,
      sigla: data.sigla ?? null,
      color: data.color ?? null,
      logo_url: data.logo_url ?? null,
      observaciones: data.observaciones ?? null,
    })
    .select('*')
    .single()
  return throwOnError(result) as EquipoRow
}

export async function updateEquipo(id: string, data: Partial<EquipoInput>): Promise<EquipoRow> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.sigla !== undefined) patch.sigla = data.sigla
  if (data.color !== undefined) patch.color = data.color
  if (data.logo_url !== undefined) patch.logo_url = data.logo_url
  if (data.observaciones !== undefined) patch.observaciones = data.observaciones

  const result = await supabase.from('equipos').update(patch).eq('id', id).select('*').single()
  return throwOnError(result) as EquipoRow
}

export async function deleteEquipo(id: string): Promise<void> {
  const result = await supabase.from('equipos').delete().eq('id', id)
  if (result.error) {
    throw new Error(result.error.message)
  }
}

export async function getEquipoById(id: string): Promise<EquipoRow | null> {
  const result = await supabase.from('equipos').select('*').eq('id', id).maybeSingle()
  return throwOnError(result) as EquipoRow | null
}
