import { supabase } from '@/lib/supabase'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { partidoIdsParaEstadisticasFase } from '@/features/fases/fasesTorneoService'

export type VistaRow = Record<string, unknown>

async function fetchViewTorneo(view: string, torneoId: string): Promise<VistaRow[]> {
  const r = await supabase.from(view).select('*').eq('torneo_id', torneoId)
  if (!r.error && r.data && r.data.length > 0) return r.data as VistaRow[]

  const r2 = await supabase.from(view).select('*')
  if (r2.error || !r2.data) return []
  return (r2.data as VistaRow[]).filter((row) => pickStr(row, 'torneo_id') === torneoId)
}

export function filterVistaRowsPorCategoria(rows: VistaRow[], categoriaId: string): VistaRow[] {
  if (!categoriaId) return rows
  return rows.filter((r) => {
    const cid = pickStr(r, 'categoria_id')
    return !cid || cid === categoriaId
  })
}

export function filterVistaRowsPorFase(rows: VistaRow[], faseTorneoId: string): VistaRow[] {
  if (!faseTorneoId) return rows
  return rows.filter((r) => {
    const fid = pickStr(r, 'fase_torneo_id', 'fase_id')
    return !fid || fid === faseTorneoId
  })
}

export async function fetchEstadisticasTorneo(torneoId: string): Promise<{
  tabla: VistaRow[]
  goleadores: VistaRow[]
  disciplina: VistaRow[]
}> {
  const [tabla, goleadores, disciplina] = await Promise.all([
    fetchViewTorneo('vw_tabla_posiciones', torneoId),
    fetchViewTorneo('vw_goleadores', torneoId),
    fetchViewTorneo('vw_disciplina', torneoId),
  ])
  return { tabla, goleadores, disciplina }
}

/** Estadísticas filtradas por categoría y fase (RPC + acumulado según reinicia_tabla). */
export async function fetchEstadisticasFiltradas(
  torneoId: string,
  categoriaId: string,
  faseTorneoId: string,
): Promise<{ tabla: VistaRow[]; goleadores: VistaRow[]; disciplina: VistaRow[] }> {
  const base = await fetchEstadisticasTorneo(torneoId)
  let tabla = filterVistaRowsPorCategoria(base.tabla, categoriaId)
  let goleadores = filterVistaRowsPorCategoria(base.goleadores, categoriaId)
  let disciplina = filterVistaRowsPorCategoria(base.disciplina, categoriaId)

  if (!faseTorneoId) return { tabla, goleadores, disciplina }

  const rpcTabla = await fetchTablaPosicionesPorFase(faseTorneoId)
  if (rpcTabla.length) {
    tabla = rpcTabla
  } else {
    tabla = filterVistaRowsPorFase(tabla, faseTorneoId)
  }

  const partidoIds = new Set(await partidoIdsParaEstadisticasFase(categoriaId, faseTorneoId))
  if (partidoIds.size) {
    goleadores = filterRowsPorPartidos(goleadores, partidoIds)
    disciplina = filterRowsPorPartidos(disciplina, partidoIds)
    if (!rpcTabla.length) {
      tabla = filterRowsPorPartidos(tabla, partidoIds)
    }
  } else {
    goleadores = filterVistaRowsPorFase(goleadores, faseTorneoId)
    disciplina = filterVistaRowsPorFase(disciplina, faseTorneoId)
  }

  return { tabla, goleadores, disciplina }
}

/** Tabla de posiciones por fase (RPC). */
export async function fetchTablaPosicionesPorFase(faseTorneoId: string): Promise<VistaRow[]> {
  const variants = [
    { fase_torneo_id: faseTorneoId },
    { p_fase_torneo_id: faseTorneoId },
  ]
  for (const args of variants) {
    const r = await supabase.rpc('obtener_tabla_posiciones_por_fase', args)
    if (!r.error && r.data) {
      return (Array.isArray(r.data) ? r.data : [r.data]) as VistaRow[]
    }
  }
  return []
}

export function filterRowsPorPartidos(rows: VistaRow[], partidoIds: Set<string>): VistaRow[] {
  if (!partidoIds.size) return rows
  const hasPartidoCol = rows.some((row) => pickStr(row, 'partido_id'))
  if (!hasPartidoCol) return rows
  return rows.filter((row) => {
    const pid = pickStr(row, 'partido_id')
    return pid ? partidoIds.has(pid) : false
  })
}

const SKIP_KEYS = new Set(['torneo_id', 'created_at', 'updated_at'])
const TECHNICAL_KEY_RE =
  /(^id$|_id$|id$|_url$|url$|public_id$|_public_id$|^created_|^updated_|^deleted_|^logo_|_color$|^color_)/

const PRIORITY_KEYS = [
  'posicion',
  'pos',
  'equipo_nombre',
  'nombre_equipo',
  'equipo',
  'club',
  'pj',
  'pg',
  'pe',
  'pp',
  'gf',
  'gc',
  'dg',
  'puntos',
  'pts',
  'jugador',
  'nombre_jugador',
  'nombre_completo',
  'nombres',
  'goles',
  'amarillas',
  'rojas',
]

export function rowKeysForTable(rows: VistaRow[]): string[] {
  if (!rows.length) return []
  const keys = Object.keys(rows[0])
  const rest = keys.filter((k) => !PRIORITY_KEYS.includes(k) && !SKIP_KEYS.has(k) && !TECHNICAL_KEY_RE.test(k)).sort()
  const ordered = [
    ...PRIORITY_KEYS.filter((k) => keys.includes(k)),
    ...rest.filter((k) => !PRIORITY_KEYS.includes(k)),
  ]
  return ordered.filter((k) => !SKIP_KEYS.has(k) && !TECHNICAL_KEY_RE.test(k)).slice(0, 16)
}

export function formatVistaCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export type CriterioClasificacion =
  | 'puntos'
  | 'diferencia_gol'
  | 'goles_favor'
  | 'goles_contra'
  | 'fair_play'
  | 'partidos_directos'
  | 'partidos_ganados'
  | 'sorteo_manual'

export const CRITERIOS_CLASIFICACION: { id: CriterioClasificacion; label: string }[] = [
  { id: 'puntos', label: 'Puntos' },
  { id: 'diferencia_gol', label: 'Diferencia de gol' },
  { id: 'goles_favor', label: 'Goles a favor' },
  { id: 'goles_contra', label: 'Goles en contra' },
  { id: 'fair_play', label: 'Fair play' },
  { id: 'partidos_directos', label: 'Resultado entre partidos directos' },
  { id: 'partidos_ganados', label: 'Partidos ganados' },
  { id: 'sorteo_manual', label: 'Sorteo/manual' },
]

function criterioValue(row: VistaRow, criterio: CriterioClasificacion): number {
  if (criterio === 'puntos') return pickNum(row, 'puntos', 'pts')
  if (criterio === 'diferencia_gol') return pickNum(row, 'dg', 'diferencia_gol', 'gol_diferencia')
  if (criterio === 'goles_favor') return pickNum(row, 'gf', 'goles_favor', 'goles_a_favor')
  if (criterio === 'goles_contra') return -pickNum(row, 'gc', 'goles_contra', 'goles_en_contra')
  if (criterio === 'fair_play') {
    return -(
      pickNum(row, 'puntos_fair_play', 'fair_play') ||
      pickNum(row, 'amarillas', 'tarjetas_amarillas') + pickNum(row, 'rojas', 'tarjetas_rojas') * 3
    )
  }
  if (criterio === 'partidos_ganados') return pickNum(row, 'pg', 'ganados', 'partidos_ganados')
  return 0
}

export function ordenarTablaPorCriterios(rows: VistaRow[], criterios: CriterioClasificacion[]): VistaRow[] {
  if (!rows.length || !criterios.length) return rows
  return [...rows].sort((a, b) => {
    for (const criterio of criterios) {
      const av = criterioValue(a, criterio)
      const bv = criterioValue(b, criterio)
      if (av !== bv) return bv - av
    }
    return pickStr(a, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre').localeCompare(
      pickStr(b, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre'),
    )
  })
}
