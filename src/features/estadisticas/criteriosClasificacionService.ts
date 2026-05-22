import { supabase } from '@/lib/supabase'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import type { CriterioClasificacion } from '@/features/estadisticas/estadisticasService'

export type CriterioFaseRow = {
  id: string
  fase_torneo_id: string
  criterio: CriterioClasificacion
  orden: number
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
  'fair_play',
]

function mapDbCriterio(raw: string): CriterioClasificacion | null {
  const key = raw.trim().toLowerCase()
  return DB_TO_UI[key] ?? null
}

export async function listCriteriosClasificacionFase(faseTorneoId: string): Promise<CriterioFaseRow[]> {
  const r = await supabase
    .from('criterios_clasificacion_fase')
    .select('id, fase_torneo_id, criterio, orden')
    .eq('fase_torneo_id', faseTorneoId)
    .order('orden', { ascending: true })

  if (r.error) {
    console.error('Error en estadísticas', { tabla: 'criterios_clasificacion_fase', faseTorneoId, error: r.error })
    throw toUserError(r.error, 'programacion')
  }

  const rows: CriterioFaseRow[] = []
  for (const raw of (r.data ?? []) as Record<string, unknown>[]) {
    const criterio = mapDbCriterio(pickStr(raw, 'criterio', 'tipo_criterio', 'tipo'))
    if (!criterio) continue
    rows.push({
      id: pickStr(raw, 'id'),
      fase_torneo_id: faseTorneoId,
      criterio,
      orden: pickNum(raw, 'orden', 'orden_criterio') || rows.length + 1,
    })
  }
  return rows
}

export async function guardarCriteriosClasificacionFase(
  faseTorneoId: string,
  criterios: CriterioClasificacion[],
): Promise<CriterioFaseRow[]> {
  const del = await supabase.from('criterios_clasificacion_fase').delete().eq('fase_torneo_id', faseTorneoId)
  if (del.error) {
    console.error('Error en estadísticas', { action: 'delete criterios', faseTorneoId, error: del.error })
    throw toUserError(del.error, 'programacion')
  }

  if (!criterios.length) return []

  const payload = criterios.map((c, idx) => ({
    fase_torneo_id: faseTorneoId,
    criterio: UI_TO_DB[c] ?? c,
    orden: idx + 1,
  }))

  const ins = await supabase.from('criterios_clasificacion_fase').insert(payload).select('id, fase_torneo_id, criterio, orden')
  if (ins.error) {
    console.error('Error en estadísticas', { payload, error: ins.error })
    throw toUserError(ins.error, 'programacion')
  }

  return (ins.data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    return {
      id: pickStr(row, 'id'),
      fase_torneo_id: faseTorneoId,
      criterio: mapDbCriterio(pickStr(row, 'criterio')) ?? 'puntos',
      orden: pickNum(row, 'orden'),
    }
  })
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
