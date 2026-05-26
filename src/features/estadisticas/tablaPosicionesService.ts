import { supabase } from '@/lib/supabase'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'

export type TablaPosicionRow = {
  equipo_id: string
  equipo_nombre: string
  logo_url: string | null
  logo_public_id: string | null
  posicion: number
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
  fair_play: number
  pj_base: number
  pg_base: number
  pe_base: number
  pp_base: number
  gf_base: number
  gc_base: number
  pts_base: number
  fair_play_base: number
}

export type AjusteTablaPosicionesRow = {
  torneo_id: string
  categoria_id: string
  fase_torneo_id: string
  equipo_id: string
  ajuste_pj: number
  ajuste_pg: number
  ajuste_pe: number
  ajuste_pp: number
  ajuste_gf: number
  ajuste_gc: number
  ajuste_pts: number
  ajuste_fairplay: number
  observaciones: string | null
}

function num(row: Record<string, unknown>, ...keys: string[]): number {
  const v = pickNum(row, ...keys)
  return Number.isFinite(v) ? v : 0
}

function str(row: Record<string, unknown>, ...keys: string[]): string {
  return pickStr(row, ...keys) || ''
}

export function mapTablaPosicionRow(row: Record<string, unknown>): TablaPosicionRow {
  const pj = num(row, 'pj', 'partidos_jugados')
  const pg = num(row, 'pg', 'partidos_ganados', 'ganados')
  const pe = num(row, 'pe', 'partidos_empatados', 'empatados')
  const pp = num(row, 'pp', 'partidos_perdidos', 'perdidos')
  const gf = num(row, 'gf', 'goles_favor', 'goles_a_favor')
  const gc = num(row, 'gc', 'goles_contra', 'goles_en_contra')
  const dg = num(row, 'dg', 'diferencia_gol', 'gol_diferencia', 'diferencia')
  const pts = num(row, 'pts', 'puntos', 'pts_totales')
  const fair = num(row, 'fair_play', 'fairplay', 'puntos_fair_play', 'fair_play_pts')

  const pjBase = num(row, 'pj_base', 'pj_calc', 'pj_calculado', 'pj_sin_ajuste') || pj - num(row, 'ajuste_pj')
  const pgBase = num(row, 'pg_base', 'pg_calc', 'pg_calculado') || pg - num(row, 'ajuste_pg')
  const peBase = num(row, 'pe_base', 'pe_calc', 'pe_calculado') || pe - num(row, 'ajuste_pe')
  const ppBase = num(row, 'pp_base', 'pp_calc', 'pp_calculado') || pp - num(row, 'ajuste_pp')
  const gfBase = num(row, 'gf_base', 'gf_calc', 'gf_calculado') || gf - num(row, 'ajuste_gf')
  const gcBase = num(row, 'gc_base', 'gc_calc', 'gc_calculado') || gc - num(row, 'ajuste_gc')
  const ptsBase = num(row, 'pts_base', 'pts_calc', 'puntos_calc', 'puntos_calculados') || pts - num(row, 'ajuste_pts')
  const fairBase =
    num(row, 'fair_play_base', 'fairplay_base', 'fair_play_calc') || fair - num(row, 'ajuste_fairplay', 'ajuste_fair_play')

  return {
    equipo_id: str(row, 'equipo_id'),
    equipo_nombre: str(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club', 'nombre'),
    logo_url: str(row, 'logo_url') || null,
    logo_public_id: str(row, 'logo_public_id') || null,
    posicion: num(row, 'posicion', 'pos', 'posición'),
    pj,
    pg,
    pe,
    pp,
    gf,
    gc,
    dg: dg !== 0 || gf !== 0 || gc !== 0 ? dg : gf - gc,
    pts,
    fair_play: fair,
    pj_base: pjBase,
    pg_base: pgBase,
    pe_base: peBase,
    pp_base: ppBase,
    gf_base: gfBase,
    gc_base: gcBase,
    pts_base: ptsBase,
    fair_play_base: fairBase,
  }
}

export async function fetchTablaPosicionesConfig(faseTorneoId: string): Promise<TablaPosicionRow[]> {
  const variants = [{ fase_torneo_id: faseTorneoId }, { p_fase_torneo_id: faseTorneoId }]
  for (const args of variants) {
    const r = await supabase.rpc('obtener_tabla_posiciones_config', args)
    if (!r.error && r.data) {
      const rows = (Array.isArray(r.data) ? r.data : [r.data]) as Record<string, unknown>[]
      return rows.map(mapTablaPosicionRow).filter((x) => x.equipo_id)
    }
    if (r.error) {
      console.error('Error en estadísticas', { rpc: 'obtener_tabla_posiciones_config', args, error: r.error })
    }
  }
  return []
}

export async function getAjusteTablaPosiciones(
  faseTorneoId: string,
  equipoId: string,
): Promise<AjusteTablaPosicionesRow | null> {
  const r = await supabase
    .from('ajustes_tabla_posiciones')
    .select('*')
    .eq('fase_torneo_id', faseTorneoId)
    .eq('equipo_id', equipoId)
    .maybeSingle()
  if (r.error) {
    console.error('Error en estadísticas', { tabla: 'ajustes_tabla_posiciones', faseTorneoId, equipoId, error: r.error })
    return null
  }
  if (!r.data) return null
  const row = r.data as Record<string, unknown>
  return {
    torneo_id: pickStr(row, 'torneo_id'),
    categoria_id: pickStr(row, 'categoria_id'),
    fase_torneo_id: faseTorneoId,
    equipo_id: equipoId,
    ajuste_pj: num(row, 'ajuste_pj'),
    ajuste_pg: num(row, 'ajuste_pg'),
    ajuste_pe: num(row, 'ajuste_pe'),
    ajuste_pp: num(row, 'ajuste_pp'),
    ajuste_gf: num(row, 'ajuste_gf'),
    ajuste_gc: num(row, 'ajuste_gc'),
    ajuste_pts: num(row, 'ajuste_pts'),
    ajuste_fairplay: num(row, 'ajuste_fairplay', 'ajuste_fair_play'),
    observaciones: pickStr(row, 'observaciones') || null,
  }
}

export function calcularAjustesDesdeValoresFinales(
  final: Pick<TablaPosicionRow, 'pj' | 'pg' | 'pe' | 'pp' | 'gf' | 'gc' | 'pts' | 'fair_play'>,
  base: Pick<
    TablaPosicionRow,
    'pj_base' | 'pg_base' | 'pe_base' | 'pp_base' | 'gf_base' | 'gc_base' | 'pts_base' | 'fair_play_base'
  >,
): Omit<AjusteTablaPosicionesRow, 'torneo_id' | 'categoria_id' | 'fase_torneo_id' | 'equipo_id' | 'observaciones'> {
  return {
    ajuste_pj: final.pj - base.pj_base,
    ajuste_pg: final.pg - base.pg_base,
    ajuste_pe: final.pe - base.pe_base,
    ajuste_pp: final.pp - base.pp_base,
    ajuste_gf: final.gf - base.gf_base,
    ajuste_gc: final.gc - base.gc_base,
    ajuste_pts: final.pts - base.pts_base,
    ajuste_fairplay: final.fair_play - base.fair_play_base,
  }
}

export async function upsertAjusteTablaPosiciones(input: AjusteTablaPosicionesRow): Promise<void> {
  const payload = {
    torneo_id: input.torneo_id,
    categoria_id: input.categoria_id,
    fase_torneo_id: input.fase_torneo_id,
    equipo_id: input.equipo_id,
    ajuste_pj: input.ajuste_pj,
    ajuste_pg: input.ajuste_pg,
    ajuste_pe: input.ajuste_pe,
    ajuste_pp: input.ajuste_pp,
    ajuste_gf: input.ajuste_gf,
    ajuste_gc: input.ajuste_gc,
    ajuste_pts: input.ajuste_pts,
    ajuste_fairplay: input.ajuste_fairplay,
    observaciones: input.observaciones?.trim() || null,
  }
  const r = await supabase.from('ajustes_tabla_posiciones').upsert(payload, {
    onConflict: 'fase_torneo_id,equipo_id',
  })
  if (r.error) {
    console.error('Error en estadísticas', { payload, error: r.error })
    throw toUserError(r.error, 'programacion')
  }
}
