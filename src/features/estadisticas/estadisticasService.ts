import { supabase } from '@/lib/supabase'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { partidoIdsParaEstadisticasFase } from '@/features/fases/fasesTorneoService'
import type { TablaPosicionRow } from '@/features/estadisticas/tablaPosicionesService'

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

function equipoKey(row: VistaRow): string {
  return (
    pickStr(row, 'equipo_id', 'id_equipo') ||
    pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre').trim().toLowerCase()
  )
}

function pickNullableNum(row: VistaRow, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key]
    if (value == null || value === '') continue
    const n = Number(value)
    if (!Number.isNaN(n)) return n
  }
  return null
}

async function enrichTablaConLogos(rows: VistaRow[], categoriaId?: string): Promise<VistaRow[]> {
  if (!rows.length) return rows

  const ids = [...new Set(rows.map((row) => pickStr(row, 'equipo_id', 'id_equipo')).filter(Boolean))]
  let equipos: VistaRow[] = []

  if (ids.length) {
    const byIds = await supabase
      .from('equipos')
      .select('id, nombre, sigla, logo_url, logo_public_id')
      .in('id', ids)
    if (!byIds.error) equipos = (byIds.data ?? []) as VistaRow[]
    else console.error('Error cargando logos de equipos', { ids, error: byIds.error })
  }

  if (!equipos.length && categoriaId) {
    const byCategoria = await supabase
      .from('equipos')
      .select('id, nombre, sigla, logo_url, logo_public_id')
      .eq('categoria_id', categoriaId)
    if (!byCategoria.error) equipos = (byCategoria.data ?? []) as VistaRow[]
    else console.error('Error cargando logos de equipos por categoría', { categoriaId, error: byCategoria.error })
  }

  if (!equipos.length) return rows

  const equiposMap = new Map<string, VistaRow>()
  for (const equipo of equipos) {
    const id = pickStr(equipo, 'id')
    const nombre = pickStr(equipo, 'nombre').trim().toLowerCase()
    if (id) equiposMap.set(id, equipo)
    if (nombre) equiposMap.set(nombre, equipo)
  }

  return rows.map((row) => {
    const currentLogo = pickStr(row, 'logo_public_id', 'equipo_logo_public_id', 'escudo_public_id', 'logo_url', 'equipo_logo_url', 'escudo_url')
    if (currentLogo) return row
    const equipo = equiposMap.get(equipoKey(row))
    if (!equipo) return row
    return {
      ...row,
      equipo_id: pickStr(row, 'equipo_id', 'id_equipo') || pickStr(equipo, 'id'),
      equipo_nombre: pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre') || pickStr(equipo, 'nombre'),
      sigla: pickStr(row, 'sigla') || pickStr(equipo, 'sigla'),
      logo_url: pickStr(equipo, 'logo_url') || pickStr(row, 'logo_url', 'equipo_logo_url', 'escudo_url'),
      logo_public_id: pickStr(equipo, 'logo_public_id') || pickStr(row, 'logo_public_id', 'equipo_logo_public_id', 'escudo_public_id'),
    }
  })
}

type TablaCalcRow = VistaRow & {
  equipo_id: string
  equipo_nombre: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
  puntos: number
}

function emptyCalcRow(row: VistaRow): TablaCalcRow {
  return {
    ...row,
    equipo_id: pickStr(row, 'equipo_id', 'id_equipo'),
    equipo_nombre: pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre'),
    pj: 0,
    pg: 0,
    pe: 0,
    pp: 0,
    gf: 0,
    gc: 0,
    dg: 0,
    pts: 0,
    puntos: 0,
    fair_play: pickNum(row, 'fair_play', 'puntos_fair_play', 'fairplay'),
    puntos_fair_play: pickNum(row, 'puntos_fair_play', 'fair_play', 'fairplay'),
  }
}

function hasResultadoReal(row: VistaRow): boolean {
  const definicion = pickStr(row, 'definicion').toLowerCase()
  if (definicion === 'walkover' || definicion === 'suspendido' || definicion === 'penales') return true
  if (pickStr(row, 'acta_id', 'acta_partido_id')) return true
  if (pickStr(row, 'equipo_ganador_id')) return true
  if (pickNullableNum(row, 'goles_local', 'goles_visitante') != null) return true
  return false
}

function addResultado(row: TablaCalcRow, gf: number, gc: number, outcome: 'win' | 'draw' | 'loss' | 'none'): void {
  row.pj += 1
  row.gf += gf
  row.gc += gc
  row.dg = row.gf - row.gc
  if (outcome === 'win') {
    row.pg += 1
    row.pts += 3
  } else if (outcome === 'draw') {
    row.pe += 1
    row.pts += 1
  } else if (outcome === 'loss') {
    row.pp += 1
  }
  row.puntos = row.pts
}

async function recalcularTablaDesdeResultados(
  baseRows: VistaRow[],
  faseTorneoId: string,
  grupoId: string | null,
  partidoIdsOverride?: string[],
): Promise<VistaRow[]> {
  if (!faseTorneoId) return baseRows

  let partidosQuery = supabase.from('partidos').select('id, equipo_local_id, equipo_visitante_id, estado, grupo_id')
  if (partidoIdsOverride?.length) {
    partidosQuery = partidosQuery.in('id', partidoIdsOverride)
  } else {
    partidosQuery = partidosQuery.eq('fase_torneo_id', faseTorneoId)
    partidosQuery = grupoId ? partidosQuery.eq('grupo_id', grupoId) : partidosQuery
  }
  const partidosRes = await partidosQuery

  if (partidosRes.error || !partidosRes.data?.length) {
    if (partidosRes.error) console.error('Error recalculando tabla: partidos', { faseTorneoId, grupoId, error: partidosRes.error })
    return baseRows
  }

  const partidos = (partidosRes.data ?? []) as VistaRow[]
  const partidoIds = partidos.map((p) => pickStr(p, 'id')).filter(Boolean)
  if (!partidoIds.length) return baseRows

  const resultadosRes = await supabase
    .from('vw_partidos_resultado_detalle')
    .select('*')
    .in('partido_id', partidoIds)

  if (resultadosRes.error || !resultadosRes.data?.length) {
    if (resultadosRes.error) {
      console.error('Error recalculando tabla: resultados', { faseTorneoId, grupoId, error: resultadosRes.error })
    }
    return baseRows
  }

  const resultados = new Map<string, VistaRow>()
  for (const row of (resultadosRes.data ?? []) as VistaRow[]) {
    const partidoId = pickStr(row, 'partido_id', 'id')
    if (partidoId) resultados.set(partidoId, row)
  }

  const equipoIds = [
    ...new Set(
      partidos
        .flatMap((p) => [pickStr(p, 'equipo_local_id'), pickStr(p, 'equipo_visitante_id')])
        .filter(Boolean),
    ),
  ]
  const equiposRes = equipoIds.length
    ? await supabase.from('equipos').select('id, nombre, sigla, logo_url, logo_public_id').in('id', equipoIds)
    : { data: [], error: null }
  if (equiposRes.error) console.error('Error recalculando tabla: equipos', { equipoIds, error: equiposRes.error })

  const baseByEquipo = new Map<string, VistaRow>()
  for (const row of baseRows) {
    const id = pickStr(row, 'equipo_id', 'id_equipo')
    if (id) baseByEquipo.set(id, row)
  }
  for (const equipo of ((equiposRes.data ?? []) as VistaRow[])) {
    const id = pickStr(equipo, 'id')
    if (!id || baseByEquipo.has(id)) continue
    baseByEquipo.set(id, {
      equipo_id: id,
      equipo_nombre: pickStr(equipo, 'nombre'),
      sigla: pickStr(equipo, 'sigla'),
      logo_url: pickStr(equipo, 'logo_url'),
      logo_public_id: pickStr(equipo, 'logo_public_id'),
    })
  }

  const calc = new Map<string, TablaCalcRow>()
  for (const row of baseByEquipo.values()) {
    const id = pickStr(row, 'equipo_id', 'id_equipo')
    if (id) calc.set(id, emptyCalcRow(row))
  }

  const ensure = (equipoId: string): TablaCalcRow | null => {
    if (!equipoId) return null
    const existing = calc.get(equipoId)
    if (existing) return existing
    const base = baseByEquipo.get(equipoId)
    if (!base) return null
    const created = emptyCalcRow(base)
    calc.set(equipoId, created)
    return created
  }

  for (const partido of partidos) {
    const partidoId = pickStr(partido, 'id')
    const result = resultados.get(partidoId)
    if (!result) continue
    if (!hasResultadoReal(result)) continue

    const localId = pickStr(partido, 'equipo_local_id')
    const visitanteId = pickStr(partido, 'equipo_visitante_id')
    const local = ensure(localId)
    const visitante = ensure(visitanteId)
    if (!local || !visitante) continue

    const definicion = pickStr(result, 'definicion').toLowerCase()
    const ganadorId = pickStr(result, 'equipo_ganador_id')
    let ml = pickNullableNum(result, 'marcador_local', 'goles_local')
    let mv = pickNullableNum(result, 'marcador_visitante', 'goles_visitante')

    if (definicion === 'suspendido') {
      addResultado(local, 0, 0, 'none')
      addResultado(visitante, 0, 0, 'none')
      continue
    }

    if (definicion === 'walkover') {
      ml = ganadorId === localId ? 3 : 0
      mv = ganadorId === visitanteId ? 3 : 0
      addResultado(local, ml, mv, ganadorId === localId ? 'win' : 'loss')
      addResultado(visitante, mv, ml, ganadorId === visitanteId ? 'win' : 'loss')
      continue
    }

    if (ml == null || mv == null) {
      continue
    }

    if (definicion === 'penales' && ganadorId) {
      addResultado(local, ml, mv, ganadorId === localId ? 'win' : 'loss')
      addResultado(visitante, mv, ml, ganadorId === visitanteId ? 'win' : 'loss')
      continue
    }

    if (ml > mv) {
      addResultado(local, ml, mv, 'win')
      addResultado(visitante, mv, ml, 'loss')
    } else if (mv > ml) {
      addResultado(local, ml, mv, 'loss')
      addResultado(visitante, mv, ml, 'win')
    } else {
      addResultado(local, ml, mv, 'draw')
      addResultado(visitante, mv, ml, 'draw')
    }
  }

  return [...calc.values()]
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
  return {
    tabla,
    goleadores,
    disciplina,
  }
}

/** Estadísticas filtradas por categoría y fase (RPC + acumulado según reinicia_tabla). */
export async function fetchEstadisticasFiltradas(
  torneoId: string,
  categoriaId: string,
  faseTorneoId: string,
): Promise<{ tabla: VistaRow[]; goleadores: VistaRow[]; disciplina: VistaRow[] }> {
  const base = await fetchEstadisticasTorneo(torneoId)
  let tabla: VistaRow[] = []
  let goleadores = filterVistaRowsPorCategoria(base.goleadores, categoriaId)
  let disciplina = filterVistaRowsPorCategoria(base.disciplina, categoriaId)

  if (!faseTorneoId) {
    tabla = filterVistaRowsPorCategoria(base.tabla, categoriaId)
    tabla = await enrichTablaConLogos(tabla, categoriaId)
    return { tabla, goleadores, disciplina }
  }

  tabla = await fetchTablaPosicionesFaseGrupo(faseTorneoId, null)
  tabla = await enrichTablaConLogos(tabla, categoriaId)

  const partidoIdsAcumulados = await partidoIdsParaEstadisticasFase(categoriaId, faseTorneoId)
  const partidoIds = new Set(partidoIdsAcumulados)
  if (partidoIds.size) {
    goleadores = filterRowsPorPartidos(goleadores, partidoIds)
    disciplina = filterRowsPorPartidos(disciplina, partidoIds)
  } else {
    goleadores = filterVistaRowsPorFase(goleadores, faseTorneoId)
    disciplina = filterVistaRowsPorFase(disciplina, faseTorneoId)
  }

  return { tabla, goleadores, disciplina }
}

/** Tabla de posiciones por fase (RPC). */
export async function fetchTablaPosicionesFaseGrupo(
  faseTorneoId: string,
  grupoId: string | null,
): Promise<VistaRow[]> {
  const variants = [
    { p_fase_torneo_id: faseTorneoId, p_grupo_id: grupoId },
    { fase_torneo_id: faseTorneoId, grupo_id: grupoId },
  ]
  for (const args of variants) {
    const r = await supabase.rpc('obtener_tabla_posiciones_fase_grupo', args)
    if (!r.error && r.data) {
      return enrichTablaConLogos((Array.isArray(r.data) ? r.data : [r.data]) as VistaRow[])
    }
    if (r.error) {
      console.error('Error en estadísticas', {
        rpc: 'obtener_tabla_posiciones_fase_grupo',
        args,
        error: r.error,
      })
    }
  }
  return []
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

const SKIP_KEYS = new Set(['torneo_id', 'created_at', 'updated_at', 'estado_disciplina'])
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
  if (criterio === 'goles_contra') return pickNum(row, 'gc', 'goles_contra', 'goles_en_contra')
  if (criterio === 'fair_play') {
    return pickNum(row, 'puntos_fair_play', 'fair_play', 'fairplay')
  }
  if (criterio === 'partidos_ganados') return pickNum(row, 'pg', 'ganados', 'partidos_ganados')
  return 0
}

function comparePorCriterio(a: VistaRow, b: VistaRow, criterio: CriterioClasificacion): number {
  const av = criterioValue(a, criterio)
  const bv = criterioValue(b, criterio)
  if (av === bv) return 0
  if (criterio === 'goles_contra') return av - bv
  return bv - av
}

export function ordenarTablaPorCriterios(rows: VistaRow[], criterios: CriterioClasificacion[]): VistaRow[] {
  const orden = criterios.length ? criterios : CRITERIOS_DEFECTO_ORDEN
  if (!rows.length) return rows
  return [...rows].sort((a, b) => {
    for (const criterio of orden) {
      const cmp = comparePorCriterio(a, b, criterio)
      if (cmp !== 0) return cmp
    }
    return pickStr(a, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre').localeCompare(
      pickStr(b, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre'),
    )
  })
}

const CRITERIOS_DEFECTO_ORDEN: CriterioClasificacion[] = [
  'puntos',
  'diferencia_gol',
  'goles_favor',
  'goles_contra',
  'fair_play',
]

function tablaPosicionToVistaRow(r: TablaPosicionRow): VistaRow {
  return {
    equipo_id: r.equipo_id,
    equipo_nombre: r.equipo_nombre,
    logo_url: r.logo_url,
    logo_public_id: r.logo_public_id,
    posicion: r.posicion,
    pj: r.pj,
    pg: r.pg,
    pe: r.pe,
    pp: r.pp,
    gf: r.gf,
    gc: r.gc,
    dg: r.dg,
    pts: r.pts,
    puntos: r.pts,
    fair_play: r.fair_play,
    puntos_fair_play: r.fair_play,
    pj_base: r.pj_base,
    pg_base: r.pg_base,
    pe_base: r.pe_base,
    pp_base: r.pp_base,
    gf_base: r.gf_base,
    gc_base: r.gc_base,
    pts_base: r.pts_base,
    fair_play_base: r.fair_play_base,
  }
}

export function tablaPosicionRowsFromVista(rows: VistaRow[]): TablaPosicionRow[] {
  return rows.map((row) => ({
    equipo_id: pickStr(row, 'equipo_id', 'id_equipo'),
    equipo_nombre: pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre'),
    logo_url: pickStr(row, 'logo_url', 'equipo_logo_url', 'escudo_url', 'logo', 'escudo') || null,
    logo_public_id: pickStr(row, 'logo_public_id', 'equipo_logo_public_id', 'escudo_public_id') || null,
    posicion: pickNum(row, 'posicion', 'pos'),
    pj: pickNum(row, 'pj'),
    pg: pickNum(row, 'pg'),
    pe: pickNum(row, 'pe'),
    pp: pickNum(row, 'pp'),
    gf: pickNum(row, 'gf'),
    gc: pickNum(row, 'gc'),
    dg: pickNum(row, 'dg'),
    pts: pickNum(row, 'pts', 'puntos'),
    fair_play: pickNum(row, 'fair_play', 'puntos_fair_play', 'fairplay'),
    pj_base: pickNum(row, 'pj_base'),
    pg_base: pickNum(row, 'pg_base'),
    pe_base: pickNum(row, 'pe_base'),
    pp_base: pickNum(row, 'pp_base'),
    gf_base: pickNum(row, 'gf_base'),
    gc_base: pickNum(row, 'gc_base'),
    pts_base: pickNum(row, 'pts_base'),
    fair_play_base: pickNum(row, 'fair_play_base'),
  }))
}
