import { supabase } from '@/lib/supabase'
import type { CategoriaRow, FormatoCompetencia } from '@/types/database'
import { mapCategoriaRow, type Categoria } from '@/types/torneo'
import { toUserError } from '@/lib/supabaseErrors'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

async function countEquiposPorCategoria(categoriaIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (categoriaIds.length === 0) return map
  const result = await supabase.from('equipos').select('categoria_id').in('categoria_id', categoriaIds)
  const rows = throwOnError(result) as { categoria_id: string }[]
  for (const r of rows) {
    map.set(r.categoria_id, (map.get(r.categoria_id) ?? 0) + 1)
  }
  return map
}

async function countPartidosPorCategoria(categoriaIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (categoriaIds.length === 0) return map
  const result = await supabase.from('partidos').select('categoria_id').in('categoria_id', categoriaIds)
  const rows = throwOnError(result) as { categoria_id: string }[]
  for (const r of rows) {
    map.set(r.categoria_id, (map.get(r.categoria_id) ?? 0) + 1)
  }
  return map
}

export async function getCategorias(torneoId: string): Promise<Categoria[]> {
  const result = await supabase
    .from('categorias')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  const rows = throwOnError(result) as CategoriaRow[]
  const ids = rows.map((r) => r.id)
  const [eqMap, parMap] = await Promise.all([countEquiposPorCategoria(ids), countPartidosPorCategoria(ids)])

  return rows.map((row) =>
    mapCategoriaRow(row, {
      equipos: eqMap.get(row.id) ?? 0,
      partidos: parMap.get(row.id) ?? 0,
    }),
  )
}

export type CategoriaInput = {
  nombre: string
  rango_edad?: string | null
  edad_min?: number | null
  edad_max?: number | null
  color?: string | null
  orden?: number
  valor_inscripcion: number
  tarifa_arbitraje: number
  formato: FormatoCompetencia
}

function faseTipoDesdeFormato(formato: FormatoCompetencia): string {
  if (formato === 'eliminatoria') return 'eliminatoria_directa'
  return formato
}

async function createFaseInicialCategoria(torneoId: string, categoriaId: string, formato: FormatoCompetencia): Promise<void> {
  const base = {
    torneo_id: torneoId,
    categoria_id: categoriaId,
    nombre: 'Fase 1',
    orden: 1,
    activa: true,
    reinicia_tabla: true,
    descripcion: null,
  }
  const tipo = faseTipoDesdeFormato(formato)
  const variants = [
    { ...base, tipo_fase: tipo },
    { ...base, tipo },
  ]
  let lastError: unknown = null
  for (const variant of variants) {
    const r = await supabase.from('fases_torneo').insert(variant as Record<string, unknown>).select('id').single()
    if (!r.error) return
    lastError = r.error
  }
  throw toUserError(lastError, 'fixture')
}

export async function createCategoria(torneoId: string, data: CategoriaInput): Promise<CategoriaRow> {
  const { data: maxRows, error: maxErr } = await supabase
    .from('categorias')
    .select('orden')
    .eq('torneo_id', torneoId)
    .order('orden', { ascending: false })
    .limit(1)
  if (maxErr) throw new Error(maxErr.message)
  const nextOrden =
    (maxRows?.[0] as { orden: number } | undefined)?.orden != null
      ? (maxRows[0] as { orden: number }).orden + 1
      : 0

  const insert = {
    torneo_id: torneoId,
    nombre: data.nombre,
    rango_edad: data.rango_edad ?? null,
    edad_min: data.edad_min ?? null,
    edad_max: data.edad_max ?? null,
    color: data.color ?? '#22c55e',
    orden: nextOrden,
    activa: true,
    valor_inscripcion: data.valor_inscripcion,
    tarifa_arbitraje: data.tarifa_arbitraje,
    formato: data.formato,
  }

  const result = await supabase.from('categorias').insert(insert).select('*').single()
  const categoria = throwOnError(result) as CategoriaRow
  await createFaseInicialCategoria(torneoId, categoria.id, data.formato)
  return categoria
}

export async function updateCategoria(
  id: string,
  data: Partial<CategoriaInput> & { activa?: boolean },
): Promise<CategoriaRow> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.rango_edad !== undefined) patch.rango_edad = data.rango_edad
  if (data.edad_min !== undefined) patch.edad_min = data.edad_min
  if (data.edad_max !== undefined) patch.edad_max = data.edad_max
  if (data.color !== undefined) patch.color = data.color
  if (data.valor_inscripcion !== undefined) patch.valor_inscripcion = data.valor_inscripcion
  if (data.tarifa_arbitraje !== undefined) patch.tarifa_arbitraje = data.tarifa_arbitraje
  if (data.formato !== undefined) patch.formato = data.formato
  if (data.activa !== undefined) patch.activa = data.activa
  if (data.orden !== undefined) patch.orden = data.orden

  const result = await supabase.from('categorias').update(patch).eq('id', id).select('*').single()
  return throwOnError(result) as CategoriaRow
}

export async function toggleCategoria(id: string, activa: boolean): Promise<CategoriaRow> {
  return updateCategoria(id, { activa })
}

export async function getCategoriaById(id: string): Promise<CategoriaRow | null> {
  const result = await supabase.from('categorias').select('*').eq('id', id).maybeSingle()
  return throwOnError(result) as CategoriaRow | null
}

async function deletePartidosDependencias(partidoIds: string[], context: 'categoria' | 'fixture' = 'categoria') {
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
    if (r.error) throw toUserError(r.error, context)
  }
}

export async function deleteCategoria(id: string): Promise<void> {
  const [eqRes, parRes] = await Promise.all([
    supabase.from('equipos').select('id').eq('categoria_id', id),
    supabase.from('partidos').select('id').eq('categoria_id', id),
  ])
  if (eqRes.error) throw toUserError(eqRes.error, 'categoria')
  if (parRes.error) throw toUserError(parRes.error, 'categoria')
  const equipoIds = ((eqRes.data ?? []) as { id: string }[]).map((row) => row.id)
  const partidoIds = ((parRes.data ?? []) as { id: string }[]).map((row) => row.id)

  await deletePartidosDependencias(partidoIds)

  if (equipoIds.length) {
    const equipoSteps = [
      () => supabase.from('abonos').delete().in('equipo_id', equipoIds),
      () => supabase.from('pagos_inscripcion').delete().in('equipo_id', equipoIds),
      () => supabase.from('jugador_equipos').delete().in('equipo_id', equipoIds),
      () => supabase.from('equipos').delete().in('id', equipoIds),
    ]
    for (const step of equipoSteps) {
      const r = await step()
      if (r.error) throw toUserError(r.error, 'categoria')
    }
  }

  const fases = await supabase.from('fases_torneo').delete().eq('categoria_id', id)
  if (fases.error) throw toUserError(fases.error, 'categoria')
  const result = await supabase.from('categorias').delete().eq('id', id)
  if (result.error) throw toUserError(result.error, 'categoria')
}

export type CategoriaDeleteSummary = {
  equipos: number
  jugadores: number
  fases: number
  partidos: number
  programaciones: number
  actas: number
  goles: number
  tarjetas: number
  pagos: number
  tieneInformacionAsociada: boolean
}

async function countByPartidos(table: string, partidoIds: string[]): Promise<number> {
  if (!partidoIds.length) return 0
  const r = await supabase.from(table).select('id', { count: 'exact', head: true }).in('partido_id', partidoIds)
  if (r.error) throw toUserError(r.error, 'categoria')
  return r.count ?? 0
}

async function countByEquipos(table: string, equipoIds: string[]): Promise<number> {
  if (!equipoIds.length) return 0
  const r = await supabase.from(table).select('id', { count: 'exact', head: true }).in('equipo_id', equipoIds)
  if (r.error) throw toUserError(r.error, 'categoria')
  return r.count ?? 0
}

export async function getCategoriaDeleteSummary(id: string): Promise<CategoriaDeleteSummary> {
  const [eqRes, parRes, faseRes] = await Promise.all([
    supabase.from('equipos').select('id').eq('categoria_id', id),
    supabase.from('partidos').select('id').eq('categoria_id', id),
    supabase.from('fases_torneo').select('id', { count: 'exact', head: true }).eq('categoria_id', id),
  ])
  if (eqRes.error) throw toUserError(eqRes.error, 'categoria')
  if (parRes.error) throw toUserError(parRes.error, 'categoria')
  if (faseRes.error) throw toUserError(faseRes.error, 'categoria')

  const equipoIds = ((eqRes.data ?? []) as { id: string }[]).map((row) => row.id)
  const partidoIds = ((parRes.data ?? []) as { id: string }[]).map((row) => row.id)
  const [jugadores, programaciones, actas, goles, tarjetas, abonos, pagosInscripcion] = await Promise.all([
    countByEquipos('jugador_equipos', equipoIds),
    countByPartidos('programaciones_partido', partidoIds),
    countByPartidos('actas_partido', partidoIds),
    countByPartidos('goles', partidoIds),
    countByPartidos('tarjetas', partidoIds),
    countByEquipos('abonos', equipoIds),
    countByEquipos('pagos_inscripcion', equipoIds),
  ])
  const pagos = abonos + pagosInscripcion
  return {
    equipos: equipoIds.length,
    jugadores,
    fases: faseRes.count ?? 0,
    partidos: partidoIds.length,
    programaciones,
    actas,
    goles,
    tarjetas,
    pagos,
    tieneInformacionAsociada:
      equipoIds.length > 0 ||
      jugadores > 0 ||
      (faseRes.count ?? 0) > 0 ||
      partidoIds.length > 0 ||
      programaciones > 0 ||
      actas > 0 ||
      goles > 0 ||
      tarjetas > 0 ||
      pagos > 0,
  }
}
