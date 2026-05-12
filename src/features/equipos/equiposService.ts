import { supabase } from '@/lib/supabase'
import type { EquipoRow } from '@/types/database'
import { mapEquipoRow, type Equipo } from '@/types/torneo'
import { assertNoSupabaseError, toUserError } from '@/lib/supabaseErrors'
import { deletePartidoCascade } from '@/features/partidos/partidoCleanup'

async function countJugadoresActivosPorEquipo(equipoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (equipoIds.length === 0) return map
  const result = await supabase
    .from('jugador_equipos')
    .select('equipo_id')
    .in('equipo_id', equipoIds)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = assertNoSupabaseError(result) as { equipo_id: string }[]
  for (const r of rows) {
    map.set(r.equipo_id, (map.get(r.equipo_id) ?? 0) + 1)
  }
  return map
}

export async function countEquiposEnCategoria(categoriaId: string): Promise<number> {
  const r = await supabase.from('equipos').select('id', { count: 'exact', head: true }).eq('categoria_id', categoriaId)
  if (r.error) throw toUserError(r.error, 'equipo')
  return r.count ?? 0
}

export async function getEquiposByCategoria(categoriaId: string): Promise<Equipo[]> {
  const result = await supabase
    .from('equipos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('nombre', { ascending: true })

  const rows = assertNoSupabaseError(result, 'equipo') as EquipoRow[]
  const ids = rows.map((r) => r.id)
  const counts = await countJugadoresActivosPorEquipo(ids)
  return rows.map((row) => mapEquipoRow(row, counts.get(row.id) ?? 0))
}

export async function existeEquipoNombreEnCategoria(
  categoriaId: string,
  nombreTrim: string,
  excludeEquipoId?: string,
): Promise<boolean> {
  const q = supabase
    .from('equipos')
    .select('id')
    .eq('categoria_id', categoriaId)
    .ilike('nombre', nombreTrim)
    .limit(5)
  const result = await q
  const rows = assertNoSupabaseError(result) as { id: string }[]
  if (excludeEquipoId) return rows.some((r) => r.id !== excludeEquipoId)
  return rows.length > 0
}

export type EquipoInput = {
  nombre: string
  sigla?: string | null
  color?: string | null
  logo_url?: string | null
  logo_public_id?: string | null
  observaciones?: string | null
  estado?: EquipoRow['estado']
  estado_inscripcion?: EquipoRow['estado_inscripcion']
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
      logo_public_id: data.logo_public_id ?? null,
      observaciones: data.observaciones ?? null,
      estado: data.estado ?? 'activo',
      estado_inscripcion: data.estado_inscripcion ?? 'pendiente',
    })
    .select('*')
    .single()
  return assertNoSupabaseError(result, 'equipo') as EquipoRow
}

export async function updateEquipo(id: string, data: Partial<EquipoInput>): Promise<EquipoRow> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.sigla !== undefined) patch.sigla = data.sigla
  if (data.color !== undefined) patch.color = data.color
  if (data.logo_url !== undefined) patch.logo_url = data.logo_url
  if (data.logo_public_id !== undefined) patch.logo_public_id = data.logo_public_id
  if (data.observaciones !== undefined) patch.observaciones = data.observaciones
  if (data.estado !== undefined) patch.estado = data.estado
  if (data.estado_inscripcion !== undefined) patch.estado_inscripcion = data.estado_inscripcion

  const result = await supabase.from('equipos').update(patch).eq('id', id).select('*').single()
  return assertNoSupabaseError(result, 'equipo') as EquipoRow
}

export async function deleteEquipo(id: string): Promise<void> {
  const par = await supabase.from('partidos').select('id').or(`equipo_local_id.eq.${id},equipo_visitante_id.eq.${id}`)
  if (par.error) throw toUserError(par.error, 'equipo')
  const partidoIds = (par.data ?? []).map((r: { id: string }) => r.id)
  for (const pid of partidoIds) {
    await deletePartidoCascade(pid)
  }

  const ab = await supabase.from('abonos').delete().eq('equipo_id', id)
  if (ab.error) throw toUserError(ab.error, 'equipo')

  const pi = await supabase.from('pagos_inscripcion').delete().eq('equipo_id', id)
  if (pi.error) throw toUserError(pi.error, 'equipo')

  const je = await supabase.from('jugador_equipos').delete().eq('equipo_id', id)
  if (je.error) throw toUserError(je.error, 'equipo')

  const result = await supabase.from('equipos').delete().eq('id', id)
  if (result.error) throw toUserError(result.error, 'equipo')
}

export async function getEquipoById(id: string): Promise<EquipoRow | null> {
  const result = await supabase.from('equipos').select('*').eq('id', id).maybeSingle()
  return assertNoSupabaseError(result) as EquipoRow | null
}
