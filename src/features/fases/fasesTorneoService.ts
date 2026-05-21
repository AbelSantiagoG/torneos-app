import { supabase } from '@/lib/supabase'
import { pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import type { TipoFaseTorneoDb } from '@/types/database'
import { isJugadoEstado } from '@/features/partidos/partidosUi'

export type FaseTorneoUi = {
  id: string
  torneo_id?: string | null
  categoria_id: string
  nombre: string
  tipo: TipoFaseTorneoDb | string
  orden: number
  activa: boolean
  reinicia_tabla: boolean
  descripcion: string | null
  /** Desde vista, si existe */
  partidos_total?: number
  partidos_jugados?: number
}

const TIPOS_FASE: { value: TipoFaseTorneoDb; label: string }[] = [
  { value: 'todos_contra_todos', label: 'Todos contra todos' },
  { value: 'fase_grupos', label: 'Fase de grupos' },
  { value: 'cuadrangulares', label: 'Cuadrangulares' },
  { value: 'eliminatoria_directa', label: 'Eliminatoria directa' },
  { value: 'final', label: 'Final' },
  { value: 'tercer_puesto', label: 'Tercer puesto' },
  { value: 'amistoso', label: 'Amistoso' },
]

export function tiposFaseOptions() {
  return TIPOS_FASE
}

function mapFaseRow(row: Record<string, unknown>): FaseTorneoUi {
  return {
    id: String(row.id ?? row.fase_torneo_id ?? ''),
    torneo_id: pickStr(row, 'torneo_id') || null,
    categoria_id: String(row.categoria_id ?? ''),
    nombre: String(row.nombre ?? row.nombre_fase ?? ''),
    tipo: pickStr(row, 'tipo', 'tipo_fase') || 'todos_contra_todos',
    orden: Number(row.orden ?? 0),
    activa: Boolean(row.activa),
    reinicia_tabla: Boolean(row.reinicia_tabla ?? row.reinicia_tabla_posiciones),
    descripcion: row.descripcion != null ? String(row.descripcion) : null,
    partidos_total: row.partidos_total != null ? Number(row.partidos_total) : undefined,
    partidos_jugados: row.partidos_jugados != null ? Number(row.partidos_jugados) : undefined,
  }
}

export async function listFasesPorCategoria(categoriaId: string): Promise<FaseTorneoUi[]> {
  const v = await supabase.from('vw_fases_torneo_detalle').select('*').eq('categoria_id', categoriaId).order('orden')
  if (!v.error && v.data?.length) {
    return (v.data as Record<string, unknown>[]).map(mapFaseRow)
  }

  const r = await supabase.from('fases_torneo').select('*').eq('categoria_id', categoriaId).order('orden')
  if (r.error) throw toUserError(r.error, 'fixture')
  return ((r.data ?? []) as Record<string, unknown>[]).map(mapFaseRow)
}

export async function getFaseActivaCategoria(categoriaId: string): Promise<FaseTorneoUi | null> {
  const list = await listFasesPorCategoria(categoriaId)
  return list.find((f) => f.activa) ?? list[list.length - 1] ?? null
}

export async function countPartidosFase(faseId: string): Promise<{ total: number; jugados: number }> {
  const r = await supabase.from('partidos').select('id, estado').eq('fase_torneo_id', faseId)
  if (r.error) throw toUserError(r.error, 'fixture')
  const rows = (r.data ?? []) as { id: string; estado: string }[]
  const total = rows.length
  const jugados = rows.filter((p) => isJugadoEstado(p.estado)).length
  return { total, jugados }
}

/** ¿Se puede ofrecer "Crear siguiente fase"? */
export async function puedeCrearSiguienteFase(categoriaId: string): Promise<{
  ok: boolean
  faseActual: FaseTorneoUi | null
  motivo?: string
}> {
  const fases = await listFasesPorCategoria(categoriaId)
  if (!fases.length) {
    return { ok: false, faseActual: null, motivo: 'Crea la primera fase de la categoría.' }
  }
  const activa = fases.find((f) => f.activa) ?? fases[fases.length - 1]!
  const { total, jugados } =
    activa.partidos_total != null && activa.partidos_jugados != null
      ? { total: activa.partidos_total, jugados: activa.partidos_jugados }
      : await countPartidosFase(activa.id)

  if (total === 0) {
    return { ok: false, faseActual: activa, motivo: 'La fase actual aún no tiene partidos en el fixture.' }
  }
  if (jugados < total) {
    return {
      ok: false,
      faseActual: activa,
      motivo: `Faltan partidos por jugar (${jugados}/${total}).`,
    }
  }
  return { ok: true, faseActual: activa }
}

export async function createFaseTorneo(input: {
  torneo_id?: string
  categoria_id: string
  nombre: string
  tipo: TipoFaseTorneoDb | string
  orden?: number
  reinicia_tabla: boolean
  descripcion?: string | null
  activa?: boolean
  fase_origen_id?: string | null
}): Promise<string> {
  if (!input.categoria_id || !input.nombre.trim() || !input.tipo) {
    throw new Error('No se pudo crear la fase. Revisa los campos obligatorios.')
  }
  const existentes = await listFasesPorCategoria(input.categoria_id)
  const orden =
    input.orden != null && !Number.isNaN(input.orden)
      ? input.orden
      : existentes.length
        ? Math.max(...existentes.map((f) => f.orden)) + 1
        : 1

  const activar = input.activa ?? existentes.length === 0
  if (activar && existentes.length) {
    await supabase.from('fases_torneo').update({ activa: false }).eq('categoria_id', input.categoria_id)
  }

  const base: Record<string, unknown> = {
    ...(input.torneo_id ? { torneo_id: input.torneo_id } : {}),
    categoria_id: input.categoria_id,
    nombre: input.nombre.trim(),
    orden,
    activa: Boolean(activar),
    reinicia_tabla: Boolean(input.reinicia_tabla),
    ...(input.fase_origen_id ? { fase_origen_id: input.fase_origen_id } : {}),
    descripcion: input.descripcion?.trim() || null,
  }

  const variants = [
    { ...base, tipo_fase: input.tipo },
    { ...base, tipo: input.tipo },
    { ...base, tipo_fase: input.tipo, descripcion: undefined },
    { ...base, tipo: input.tipo, descripcion: undefined },
  ]

  let lastError: unknown = null
  for (const variant of variants) {
    const clean = Object.fromEntries(Object.entries(variant).filter(([, value]) => value !== undefined))
    const r = await supabase.from('fases_torneo').insert(clean).select('id').single()
    if (!r.error) return String((r.data as { id: string }).id)
    lastError = r.error
  }
  throw toUserError(lastError, 'fixture')
}

export async function updateFaseTorneo(
  faseId: string,
  patch: Partial<Pick<FaseTorneoUi, 'nombre' | 'tipo' | 'orden' | 'reinicia_tabla' | 'descripcion'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.nombre != null) dbPatch.nombre = patch.nombre
  if (patch.orden != null) dbPatch.orden = patch.orden
  if (patch.reinicia_tabla != null) dbPatch.reinicia_tabla = patch.reinicia_tabla
  if (patch.descripcion != null) dbPatch.descripcion = patch.descripcion
  if (patch.tipo != null) dbPatch.tipo_fase = patch.tipo
  let r = await supabase.from('fases_torneo').update(dbPatch).eq('id', faseId)
  if (r.error && patch.tipo != null) {
    const alt = { ...dbPatch }
    delete alt.tipo_fase
    alt.tipo = patch.tipo
    r = await supabase.from('fases_torneo').update(alt).eq('id', faseId)
  }
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function setFaseActivaCategoria(categoriaId: string, faseId: string): Promise<void> {
  const r0 = await supabase.from('fases_torneo').update({ activa: false }).eq('categoria_id', categoriaId)
  if (r0.error) throw toUserError(r0.error, 'fixture')
  const r1 = await supabase.from('fases_torneo').update({ activa: true }).eq('id', faseId).eq('categoria_id', categoriaId)
  if (r1.error) throw toUserError(r1.error, 'fixture')
}

async function countByPartidos(table: string, partidoIds: string[]): Promise<number> {
  if (!partidoIds.length) return 0
  const r = await supabase.from(table).select('id', { count: 'exact', head: true }).in('partido_id', partidoIds)
  if (r.error) throw toUserError(r.error, 'fixture')
  return r.count ?? 0
}

export type FaseDeleteSummary = {
  partidos: number
  jugados: number
  programaciones: number
  actas: number
  goles: number
  tarjetas: number
  tieneInformacionAsociada: boolean
}

export async function getFaseDeleteSummary(faseId: string): Promise<FaseDeleteSummary> {
  const r = await supabase.from('partidos').select('id, estado').eq('fase_torneo_id', faseId)
  if (r.error) throw toUserError(r.error, 'fixture')
  const rows = (r.data ?? []) as { id: string; estado: string }[]
  const ids = rows.map((row) => row.id)
  const [programaciones, actas, goles, tarjetas] = await Promise.all([
    countByPartidos('programaciones_partido', ids),
    countByPartidos('actas_partido', ids),
    countByPartidos('goles', ids),
    countByPartidos('tarjetas', ids),
  ])
  const jugados = rows.filter((row) => isJugadoEstado(row.estado)).length
  return {
    partidos: rows.length,
    jugados,
    programaciones,
    actas,
    goles,
    tarjetas,
    tieneInformacionAsociada: jugados > 0 || programaciones > 0 || actas > 0 || goles > 0 || tarjetas > 0,
  }
}

async function deletePartidosDependenciasMasivo(partidoIds: string[]): Promise<void> {
  if (!partidoIds.length) return
  const steps = [
    () => supabase.from('cambios_partido').delete().in('partido_id', partidoIds),
    () => supabase.from('partido_jugadores').delete().in('partido_id', partidoIds),
    () => supabase.from('programaciones_partido').delete().in('partido_id', partidoIds),
    () => supabase.from('arbitrajes').delete().in('partido_id', partidoIds),
    () => supabase.from('goles').delete().in('partido_id', partidoIds),
    () => supabase.from('tarjetas').delete().in('partido_id', partidoIds),
    () => supabase.from('actas_partido').delete().in('partido_id', partidoIds),
    () => supabase.from('partidos').delete().in('id', partidoIds),
  ]
  for (const step of steps) {
    const r = await step()
    if (r.error) throw toUserError(r.error, 'fixture')
  }
}

export async function deleteFaseTorneo(faseId: string, categoriaId: string): Promise<void> {
  const part = await supabase.from('partidos').select('id').eq('fase_torneo_id', faseId).eq('categoria_id', categoriaId)
  if (part.error) throw toUserError(part.error, 'fixture')
  const ids = ((part.data ?? []) as { id: string }[]).map((row) => row.id)
  await deletePartidosDependenciasMasivo(ids)
  const r = await supabase.from('fases_torneo').delete().eq('id', faseId).eq('categoria_id', categoriaId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function archiveFaseTorneo(faseId: string, categoriaId: string): Promise<void> {
  const r = await supabase.from('fases_torneo').update({ activa: false }).eq('id', faseId).eq('categoria_id', categoriaId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

/** IDs de partidos para estadísticas acumuladas según reinicio de tabla. */
export async function partidoIdsParaEstadisticasFase(
  categoriaId: string,
  faseId: string,
): Promise<string[]> {
  const fases = await listFasesPorCategoria(categoriaId)
  const target = fases.find((f) => f.id === faseId)
  if (!target) return []

  const incluir = target.reinicia_tabla
    ? [target]
    : fases.filter((f) => f.orden <= target.orden)

  const ids: string[] = []
  for (const f of incluir) {
    const r = await supabase.from('partidos').select('id').eq('fase_torneo_id', f.id)
    if (!r.error && r.data) {
      for (const row of r.data as { id: string }[]) ids.push(row.id)
    }
  }
  return [...new Set(ids)]
}
