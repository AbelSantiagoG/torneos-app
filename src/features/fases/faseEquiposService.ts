import { supabase } from '@/lib/supabase'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'

export type MetodoClasificacionFase =
  | 'manual'
  | 'todos'
  | 'clasificacion'
  | 'top_tabla'
  | 'top_grupo'
  | 'sin_equipos'

export type FaseEquipoUi = {
  id: string
  fase_torneo_id: string
  equipo_id: string
  origen_fase_id: string | null
  origen_grupo_id: string | null
  posicion_origen: number | null
  metodo_clasificacion: string
  orden: number
}

export function isMissingFaseEquipos(error: unknown): boolean {
  const code = String((error as { code?: string } | null)?.code ?? '')
  const message = String((error as { message?: string } | null)?.message ?? error ?? '')
  return code === 'PGRST205' || /fase_equipos/i.test(message)
}

function mapFaseEquipo(row: Record<string, unknown>): FaseEquipoUi {
  return {
    id: pickStr(row, 'id'),
    fase_torneo_id: pickStr(row, 'fase_torneo_id'),
    equipo_id: pickStr(row, 'equipo_id'),
    origen_fase_id: pickStr(row, 'origen_fase_id') || null,
    origen_grupo_id: pickStr(row, 'origen_grupo_id') || null,
    posicion_origen: row.posicion_origen == null ? null : pickNum(row, 'posicion_origen'),
    metodo_clasificacion: pickStr(row, 'metodo_clasificacion') || 'manual',
    orden: pickNum(row, 'orden'),
  }
}

export async function listFaseEquipos(faseTorneoId: string): Promise<FaseEquipoUi[]> {
  if (!faseTorneoId) return []
  const r = await supabase
    .from('fase_equipos')
    .select('*')
    .eq('fase_torneo_id', faseTorneoId)
    .order('orden', { ascending: true })

  if (r.error) {
    if (isMissingFaseEquipos(r.error)) return []
    throw toUserError(r.error, 'fixture')
  }
  return ((r.data ?? []) as Record<string, unknown>[]).map(mapFaseEquipo)
}

export async function replaceFaseEquipos(params: {
  faseTorneoId: string
  equipoIds: string[]
  metodo: MetodoClasificacionFase
  origenFaseId?: string | null
}): Promise<void> {
  const cleanIds = [...new Set(params.equipoIds.filter(Boolean))]
  const del = await supabase.from('fase_equipos').delete().eq('fase_torneo_id', params.faseTorneoId)
  if (del.error) throw toUserError(del.error, 'fixture')
  if (!cleanIds.length) return

  const rows = cleanIds.map((equipoId, idx) => ({
    fase_torneo_id: params.faseTorneoId,
    equipo_id: equipoId,
    origen_fase_id: params.origenFaseId ?? null,
    metodo_clasificacion: params.metodo,
    orden: idx + 1,
  }))

  const ins = await supabase.from('fase_equipos').insert(rows)
  if (ins.error) throw toUserError(ins.error, 'fixture')
}

export async function asignarTodosEquiposCategoriaAFase(faseTorneoId: string, reemplazar = false): Promise<void> {
  const { error } = await supabase.rpc('asignar_todos_equipos_categoria_a_fase', {
    p_fase_torneo_id: faseTorneoId,
    p_reemplazar: reemplazar,
  })
  if (error) throw toUserError(error, 'fixture')
}

export async function asignarClasificadosGeneralesAFase(params: {
  faseDestinoId: string
  faseOrigenId: string
  cantidadClasificados: number
  reemplazar?: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('asignar_clasificados_generales_a_fase', {
    p_fase_destino_id: params.faseDestinoId,
    p_fase_origen_id: params.faseOrigenId,
    p_cantidad_clasificados: params.cantidadClasificados,
    p_reemplazar: Boolean(params.reemplazar),
  })
  if (error) throw toUserError(error, 'fixture')
}

export async function configurarCuadrangularesDesdeFaseAnterior(params: {
  faseDestinoId: string
  faseOrigenId: string
  clasificadosPorGrupo: number
  totalClasificados: number
  reemplazar?: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('configurar_cuadrangulares_desde_fase_anterior', {
    p_fase_destino_id: params.faseDestinoId,
    p_fase_origen_id: params.faseOrigenId,
    p_clasificados_por_grupo: params.clasificadosPorGrupo,
    p_total_clasificados: params.totalClasificados,
    p_reemplazar: Boolean(params.reemplazar),
  })
  if (error) throw toUserError(error, 'fixture')
}

export async function guardarFaseConfiguracion(input: {
  faseTorneoId: string
  fuenteEquipos: string
  faseOrigenId?: string | null
  cantidadClasificados?: number | null
  clasificadosPorGrupo?: number | null
  tipoCruce?: string | null
  idaVuelta?: boolean
}): Promise<void> {
  const payload = {
    fase_torneo_id: input.faseTorneoId,
    fuente_equipos: input.fuenteEquipos,
    fase_origen_id: input.faseOrigenId ?? null,
    cantidad_clasificados: input.cantidadClasificados ?? null,
    clasificados_por_grupo: input.clasificadosPorGrupo ?? null,
    tipo_cruce: input.tipoCruce ?? null,
    ida_vuelta: Boolean(input.idaVuelta),
  }

  const upsert = await supabase.from('fase_configuracion').upsert(payload, {
    onConflict: 'fase_torneo_id',
  })
  if (!upsert.error) return

  const insert = await supabase.from('fase_configuracion').insert(payload)
  if (!insert.error) return

  const update = await supabase.from('fase_configuracion').update(payload).eq('fase_torneo_id', input.faseTorneoId)
  if (!update.error) return

  console.error('No se pudo guardar configuración de fase', { payload, error: update.error })
}
