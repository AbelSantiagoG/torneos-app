import { supabase } from '@/lib/supabase'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import type { CriterioClasificacion } from '@/features/estadisticas/estadisticasService'

export type CriterioFaseRow = {
  id: string
  torneo_id?: string
  categoria_id?: string
  fase_torneo_id: string
  criterio: CriterioClasificacion
  orden: number
  direccion?: 'asc' | 'desc'
  activo?: boolean
}

const DB_TO_UI: Record<string, CriterioClasificacion> = {
  puntos: 'puntos',
  diferencia_gol: 'diferencia_gol',
  goles_favor: 'goles_favor',
  goles_contra: 'goles_contra',
  fair_play: 'fair_play',
  fairplay: 'fair_play',
  partidos_ganados: 'partidos_ganados',
  partido_directo: 'partidos_directos',
  partidos_directos: 'partidos_directos',
  manual: 'sorteo_manual',
  sorteo_manual: 'sorteo_manual',
}

const UI_TO_DB: Record<CriterioClasificacion, string> = {
  puntos: 'puntos',
  diferencia_gol: 'diferencia_gol',
  goles_favor: 'goles_favor',
  goles_contra: 'goles_contra',
  fair_play: 'fairplay',
  partidos_ganados: 'partidos_ganados',
  partidos_directos: 'partido_directo',
  sorteo_manual: 'manual',
}

export const CRITERIOS_DISPONIBLES: { id: CriterioClasificacion; label: string }[] = [
  { id: 'puntos', label: 'Puntos' },
  { id: 'diferencia_gol', label: 'Diferencia de gol' },
  { id: 'goles_favor', label: 'Goles a favor' },
  { id: 'goles_contra', label: 'Goles en contra' },
  { id: 'partidos_ganados', label: 'Partidos ganados' },
  { id: 'fair_play', label: 'Fair Play' },
  { id: 'partidos_directos', label: 'Partido directo' },
  { id: 'sorteo_manual', label: 'Manual / sorteo' },
]

export const CRITERIOS_DEFECTO: CriterioClasificacion[] = [
  'puntos',
  'diferencia_gol',
  'goles_favor',
  'goles_contra',
  'fair_play',
]

const CRITERIO_DIRECCION: Record<CriterioClasificacion, 'asc' | 'desc'> = {
  puntos: 'desc',
  diferencia_gol: 'desc',
  goles_favor: 'desc',
  goles_contra: 'asc',
  partidos_ganados: 'desc',
  fair_play: 'desc',
  partidos_directos: 'desc',
  sorteo_manual: 'asc',
}

function mapDbCriterio(raw: string): CriterioClasificacion | null {
  const key = raw.trim().toLowerCase()
  return DB_TO_UI[key] ?? null
}

function mapRow(raw: Record<string, unknown>, faseTorneoId: string): CriterioFaseRow {
  return {
    id: pickStr(raw, 'id'),
    torneo_id: pickStr(raw, 'torneo_id') || undefined,
    categoria_id: pickStr(raw, 'categoria_id') || undefined,
    fase_torneo_id: faseTorneoId,
    criterio: mapDbCriterio(pickStr(raw, 'criterio', 'tipo_criterio', 'tipo')) ?? 'puntos',
    orden: pickNum(raw, 'orden', 'orden_criterio'),
    direccion: pickStr(raw, 'direccion') === 'asc' ? 'asc' : 'desc',
    activo: raw.activo !== false,
  }
}

export async function listCriteriosClasificacionFase(faseTorneoId: string): Promise<CriterioFaseRow[]> {
  const r = await supabase
    .from('criterios_clasificacion_fase')
    .select('id, torneo_id, categoria_id, fase_torneo_id, criterio, orden, direccion, activo')
    .eq('fase_torneo_id', faseTorneoId)
    .order('orden', { ascending: true })

  if (r.error) {
    console.error('Error en estadisticas', { tabla: 'criterios_clasificacion_fase', faseTorneoId, error: r.error })
    throw toUserError(r.error, 'programacion')
  }

  return ((r.data ?? []) as Record<string, unknown>[])
    .map((row) => mapRow(row, faseTorneoId))
    .filter((row) => Boolean(row.criterio))
    .sort((a, b) => a.orden - b.orden)
}

export async function guardarCriteriosClasificacionFase(params: {
  torneoId: string
  categoriaId: string
  faseTorneoId: string
  criterios: CriterioClasificacion[]
}): Promise<CriterioFaseRow[]> {
  const faseTorneoId = params.faseTorneoId
  const criterios = normalizarOrdenCriterios(params.criterios)
  const existingRes = await supabase
    .from('criterios_clasificacion_fase')
    .select('id, criterio')
    .eq('fase_torneo_id', faseTorneoId)

  if (existingRes.error) {
    console.error('Error en estadisticas', { action: 'load criterios', faseTorneoId, error: existingRes.error })
    throw toUserError(existingRes.error, 'programacion')
  }

  const existing = ((existingRes.data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: pickStr(row, 'id'),
    criterioDb: pickStr(row, 'criterio'),
    criterioUi: mapDbCriterio(pickStr(row, 'criterio')),
  }))

  const removeIds = existing
    .filter((row) => row.id && row.criterioUi && !criterios.includes(row.criterioUi))
    .map((row) => row.id)
  if (removeIds.length) {
    const del = await supabase.from('criterios_clasificacion_fase').delete().in('id', removeIds)
    if (del.error) {
      console.error('Error en estadisticas', { action: 'delete criterios removed', faseTorneoId, removeIds, error: del.error })
      throw toUserError(del.error, 'programacion')
    }
  }

  if (!criterios.length) return []

  const existingByDb = new Map<string, string>()
  for (const row of existing) {
    if (row.criterioDb) existingByDb.set(row.criterioDb, row.id)
    if (row.criterioUi) existingByDb.set(UI_TO_DB[row.criterioUi] ?? row.criterioUi, row.id)
  }
  const selectCols = 'id, torneo_id, categoria_id, fase_torneo_id, criterio, orden, direccion, activo'
  const saved: CriterioFaseRow[] = []

  for (let idx = 0; idx < criterios.length; idx += 1) {
    const criterio = criterios[idx]!
    const criterioDb = UI_TO_DB[criterio] ?? criterio
    const payload = {
      torneo_id: params.torneoId,
      categoria_id: params.categoriaId,
      fase_torneo_id: faseTorneoId,
      criterio: criterioDb,
      orden: idx + 1,
      direccion: CRITERIO_DIRECCION[criterio],
      activo: true,
    }
    const existingId = existingByDb.get(criterioDb)
    const result = existingId
      ? await supabase.from('criterios_clasificacion_fase').update(payload).eq('id', existingId).select(selectCols).single()
      : await supabase.from('criterios_clasificacion_fase').insert(payload).select(selectCols).single()

    if (result.error) {
      console.error('Error en estadisticas', { payload, error: result.error })
      throw toUserError(result.error, 'programacion')
    }
    if (result.data) saved.push(mapRow(result.data as Record<string, unknown>, faseTorneoId))
  }

  return saved.sort((a, b) => a.orden - b.orden)
}

export function criteriosOrdenadosDesdeRows(rows: CriterioFaseRow[]): CriterioClasificacion[] {
  return [...rows].sort((a, b) => a.orden - b.orden).map((r) => r.criterio)
}

export function normalizarOrdenCriterios(list: CriterioClasificacion[]): CriterioClasificacion[] {
  const seen = new Set<CriterioClasificacion>()
  const out: CriterioClasificacion[] = []
  for (const c of list) {
    if (seen.has(c)) continue
    seen.add(c)
    out.push(c)
  }
  return out
}
