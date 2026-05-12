import { supabase } from '@/lib/supabase'
import type { TorneoRow } from '@/types/database'
import { assertNoSupabaseError } from '@/lib/supabaseErrors'
import { toFriendlyError, translateUserError } from '@/lib/errorMessages'
import { deletePartidoCascade } from '@/features/partidos/partidoCleanup'

const STORAGE_KEY = 'torneo_activo_id'

/** Lista torneos visibles para el usuario (vista). Si falla, cae a tabla torneos. */
export async function listTorneosUsuario(): Promise<TorneoRow[]> {
  const v = await supabase.from('vw_torneos_usuario').select('*').order('created_at', { ascending: true })
  if (!v.error && v.data && v.data.length > 0) {
    return v.data as TorneoRow[]
  }
  const r = await supabase.from('torneos').select('*').order('created_at', { ascending: true })
  return (assertNoSupabaseError(r) ?? []) as TorneoRow[]
}

export async function getTorneos(): Promise<TorneoRow[]> {
  return listTorneosUsuario()
}

export async function getTorneoById(id: string): Promise<TorneoRow | null> {
  const result = await supabase.from('torneos').select('*').eq('id', id).maybeSingle()
  return assertNoSupabaseError(result) as TorneoRow | null
}

export function clearTorneoActivoStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export type TorneoUpdateInput = Partial<
  Pick<TorneoRow, 'nombre' | 'organizacion' | 'descripcion' | 'fecha_inicio' | 'fecha_fin' | 'logo_url' | 'logo_public_id'>
>

export async function updateTorneo(id: string, data: TorneoUpdateInput): Promise<TorneoRow> {
  const result = await supabase.from('torneos').update(data).eq('id', id).select('*').single()
  return assertNoSupabaseError(result) as TorneoRow
}

export type CrearTorneoVacioInput = {
  nombre: string
  organizacion: string
  fecha_inicio: string | null
  fecha_fin: string | null
  descripcion: string | null
}

/** RPC crear_torneo_vacio — sin categorías por defecto. */
export async function crearTorneoVacio(input: CrearTorneoVacioInput): Promise<string> {
  const variants: Record<string, unknown>[] = [
    {
      nombre: input.nombre,
      organizacion: input.organizacion,
      fecha_inicio: input.fecha_inicio,
      fecha_fin: input.fecha_fin,
      descripcion: input.descripcion,
    },
    {
      p_nombre: input.nombre,
      p_organizacion: input.organizacion,
      p_fecha_inicio: input.fecha_inicio,
      p_fecha_fin: input.fecha_fin,
      p_descripcion: input.descripcion,
    },
  ]

  let last: unknown = null
  for (const args of variants) {
    const { data, error } = await supabase.rpc('crear_torneo_vacio', args)
    if (!error) {
      if (typeof data === 'string' && data.length > 0) return data
      if (data && typeof data === 'object' && 'id' in (data as object)) return String((data as { id: string }).id)
      if (data != null) return String(data)
      throw new Error(translateUserError(new Error('La función no devolvió el ID del torneo.'), 'rpc'))
    }
    last = error
  }
  throw toFriendlyError(last, 'rpc')
}

/** Elimina torneo y datos dependientes (orden seguro para FKs). */
export async function deleteTorneo(torneoId: string): Promise<void> {
  const pRes = await supabase.from('partidos').select('id').eq('torneo_id', torneoId)
  if (pRes.error) throw toFriendlyError(pRes.error, 'torneo')
  for (const row of pRes.data ?? []) {
    await deletePartidoCascade((row as { id: string }).id)
  }

  const pagosRes = await supabase.from('pagos_inscripcion').select('id').eq('torneo_id', torneoId)
  const pagoIds = (pagosRes.data ?? []).map((r: { id: string }) => r.id)
  if (pagoIds.length) {
    const ab = await supabase.from('abonos').delete().in('pago_inscripcion_id', pagoIds)
    if (ab.error) throw toFriendlyError(ab.error, 'torneo')
  }
  const delPagos = await supabase.from('pagos_inscripcion').delete().eq('torneo_id', torneoId)
  if (delPagos.error) throw toFriendlyError(delPagos.error, 'torneo')

  const eqRes = await supabase.from('equipos').select('id').eq('torneo_id', torneoId)
  const eqIds = (eqRes.data ?? []).map((r: { id: string }) => r.id)
  if (eqIds.length) {
    const je = await supabase.from('jugador_equipos').delete().in('equipo_id', eqIds)
    if (je.error) throw toFriendlyError(je.error, 'torneo')
  }
  const delEq = await supabase.from('equipos').delete().eq('torneo_id', torneoId)
  if (delEq.error) throw toFriendlyError(delEq.error, 'torneo')

  const delJug = await supabase.from('jugadores').delete().eq('torneo_id', torneoId)
  if (delJug.error) throw toFriendlyError(delJug.error, 'torneo')

  const delCat = await supabase.from('categorias').delete().eq('torneo_id', torneoId)
  if (delCat.error) throw toFriendlyError(delCat.error, 'torneo')

  await supabase.from('egresos').delete().eq('torneo_id', torneoId)
  await supabase.from('horarios').delete().eq('torneo_id', torneoId)
  await supabase.from('canchas').delete().eq('torneo_id', torneoId)
  await supabase.from('arbitros').delete().eq('torneo_id', torneoId)
  await supabase.from('escuelas_arbitrales').delete().eq('torneo_id', torneoId)
  await supabase.from('torneo_usuarios').delete().eq('torneo_id', torneoId)

  const delT = await supabase.from('torneos').delete().eq('id', torneoId)
  if (delT.error) throw toFriendlyError(delT.error, 'torneo')
}
