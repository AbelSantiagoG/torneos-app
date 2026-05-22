import { supabase } from '@/lib/supabase'
import { assertNoSupabaseError } from '@/lib/supabaseErrors'
import {
  listPartidosFixtureTorneo,
  listPartidosProgramadosTorneo,
  type PartidoListaUi,
} from '@/features/partidos/partidosService'
import { isJugadoEstado } from '@/features/partidos/partidosUi'
import type { DefinicionPartidoDb, RolPartidoJugadorDb, TipoGolDb, TipoTarjetaActaDb } from '@/types/database'

export type GolActaRow = {
  id?: string
  partido_id: string
  jugador_id: string
  equipo_id: string
  minuto: number | null
  tipo_gol: TipoGolDb | string
}

export type TarjetaActaRow = {
  id?: string
  partido_id: string
  jugador_id: string
  equipo_id: string
  tipo: TipoTarjetaActaDb | string
  minuto: number | null
  motivo: string | null
}

export type ActaPartidoRow = {
  id: string
  partido_id: string
  arbitro_id: string | null
  observaciones: string | null
  cerrada: boolean | null
  definicion: DefinicionPartidoDb | string | null
  fue_tiempo_extra: boolean | null
  fue_penales: boolean | null
  penales_local: number | null
  penales_visitante: number | null
  equipo_ganador_id: string | null
  equipo_no_presentado_id: string | null
  arbitro_nombre: string | null
  escuela_arbitral_nombre: string | null
  export_url: string | null
}

export type PartidoJugadorActaRow = {
  id?: string
  partido_id: string
  equipo_id: string
  jugador_id: string
  rol: RolPartidoJugadorDb | string
}

export type CambioPartidoActaRow = {
  id?: string
  partido_id: string
  equipo_id: string
  jugador_sale_id: string
  jugador_entra_id: string
  minuto: number | null
  observacion: string | null
}

const ACTA_SELECT =
  'id, partido_id, arbitro_id, observaciones, cerrada, definicion, fue_tiempo_extra, fue_penales, penales_local, penales_visitante, equipo_ganador_id, equipo_no_presentado_id, arbitro_nombre, escuela_arbitral_nombre, export_url'

async function fetchActasResumenPorPartidos(partidoIds: string[]): Promise<Map<string, { cerrada: boolean }>> {
  const map = new Map<string, { cerrada: boolean }>()
  if (!partidoIds.length) return map
  const r = await supabase.from('actas_partido').select('partido_id, cerrada').in('partido_id', partidoIds)
  if (r.error) return map
  for (const row of (r.data ?? []) as { partido_id?: string; cerrada?: boolean | null }[]) {
    const pid = String(row.partido_id ?? '')
    if (!pid) continue
    map.set(pid, { cerrada: Boolean(row.cerrada) })
  }
  return map
}

/** Partidos de la categoría: con programación o marcados como jugados en el fixture. Incluye resumen de acta. */
export async function listPartidosParaActa(torneoId: string, categoriaId: string): Promise<PartidoListaUi[]> {
  const [programados, fixture] = await Promise.all([
    listPartidosProgramadosTorneo(torneoId),
    listPartidosFixtureTorneo(torneoId, categoriaId),
  ])
  const progCat = programados.filter((p) => p.categoriaId === categoriaId)
  const ids = new Set(progCat.map((p) => p.id))
  const jugadosExtra = fixture.filter((p) => isJugadoEstado(p.estado) && !ids.has(p.id))
  const merged = [...progCat, ...jugadosExtra].sort((a, b) => {
    const fa = a.fecha || ''
    const fb = b.fecha || ''
    if (fa !== fb) return fa.localeCompare(fb)
    return String(a.hora).localeCompare(String(b.hora))
  })
  const actaMap = await fetchActasResumenPorPartidos(merged.map((p) => p.id))
  return merged.map((p) => {
    const a = actaMap.get(p.id)
    return {
      ...p,
      actaCerrada: a?.cerrada ?? null,
    }
  })
}

export type EstadoActaUi = 'sin_acta' | 'edicion' | 'cerrada'

export function estadoActaUi(partido: PartidoListaUi): EstadoActaUi {
  if (partido.actaCerrada === true) return 'cerrada'
  if (partido.actaCerrada === false) return 'edicion'
  return 'sin_acta'
}

export async function getActaByPartido(partidoId: string): Promise<ActaPartidoRow | null> {
  const ex = await supabase.from('actas_partido').select(ACTA_SELECT).eq('partido_id', partidoId).maybeSingle()
  const found = assertNoSupabaseError(ex, 'programacion') as ActaPartidoRow | null
  return found
}

export async function getOrCreateActa(partidoId: string): Promise<ActaPartidoRow> {
  const existing = await getActaByPartido(partidoId)
  if (existing) return existing

  const ins = await supabase
    .from('actas_partido')
    .insert({
      partido_id: partidoId,
      definicion: 'tiempo_reglamentario',
      cerrada: false,
      fue_tiempo_extra: false,
      fue_penales: false,
    })
    .select(ACTA_SELECT)
    .single()
  return assertNoSupabaseError(ins, 'programacion') as ActaPartidoRow
}

export async function updateActaCabecera(actaId: string, patch: Partial<ActaPartidoRow>): Promise<void> {
  const allowed: Partial<Record<keyof ActaPartidoRow, unknown>> = {}
  const keys: (keyof ActaPartidoRow)[] = [
    'arbitro_id',
    'observaciones',
    'cerrada',
    'definicion',
    'fue_tiempo_extra',
    'fue_penales',
    'penales_local',
    'penales_visitante',
    'equipo_ganador_id',
    'equipo_no_presentado_id',
    'arbitro_nombre',
    'escuela_arbitral_nombre',
    'export_url',
  ]
  for (const k of keys) {
    if (k in patch && patch[k] !== undefined) {
      ;(allowed as Record<string, unknown>)[k] = patch[k]
    }
  }
  if (!Object.keys(allowed).length) return
  const r = await supabase.from('actas_partido').update(allowed).eq('id', actaId)
  if (r.error) console.error('Error actualizando cabecera de acta', { actaId, payload: allowed, error: r.error })
  assertNoSupabaseError(r, 'programacion')
}

export async function listGolesPartido(partidoId: string): Promise<GolActaRow[]> {
  const r = await supabase
    .from('goles')
    .select('id, partido_id, jugador_id, equipo_id, minuto, tipo_gol')
    .eq('partido_id', partidoId)
  return (assertNoSupabaseError(r, 'programacion') ?? []) as GolActaRow[]
}

export async function listTarjetasPartido(partidoId: string): Promise<TarjetaActaRow[]> {
  const r = await supabase.from('tarjetas').select('*').eq('partido_id', partidoId)
  const rows = (assertNoSupabaseError(r, 'programacion') ?? []) as Record<string, unknown>[]
  return rows.map((raw) => ({
    id: String(raw.id ?? ''),
    partido_id: String(raw.partido_id ?? ''),
    jugador_id: String(raw.jugador_id ?? ''),
    equipo_id: String(raw.equipo_id ?? ''),
    tipo: String(raw.tipo ?? 'amarilla'),
    minuto: raw.minuto != null && raw.minuto !== '' ? Number(raw.minuto) : null,
    motivo: raw.motivo != null ? String(raw.motivo) : null,
  }))
}

export async function listPartidoJugadores(partidoId: string): Promise<PartidoJugadorActaRow[]> {
  const r = await supabase.from('partido_jugadores').select('*').eq('partido_id', partidoId)
  if (r.error) return []
  return (r.data ?? []) as PartidoJugadorActaRow[]
}

export async function listCambiosPartido(partidoId: string): Promise<CambioPartidoActaRow[]> {
  const r = await supabase.from('cambios_partido').select('*').eq('partido_id', partidoId)
  if (r.error) return []
  return (r.data ?? []) as CambioPartidoActaRow[]
}

function countGolesMarcador(
  rows: { equipo_id: string; tipo_gol?: string | null }[],
  equipoLocalId: string,
  equipoVisitanteId: string,
) {
  let local = 0
  let vis = 0
  for (const g of rows) {
    const tipo = (g.tipo_gol ?? 'normal').toLowerCase()
    if (tipo === 'autogol') {
      if (g.equipo_id === equipoLocalId) vis++
      else if (g.equipo_id === equipoVisitanteId) local++
    } else {
      if (g.equipo_id === equipoLocalId) local++
      else if (g.equipo_id === equipoVisitanteId) vis++
    }
  }
  return { local, vis }
}

export async function guardarActaCompleta(input: {
  actaId: string
  partidoId: string
  equipoLocalId: string
  equipoVisitanteId: string
  arbitro_id: string | null
  arbitro_nombre: string | null
  escuela_arbitral_nombre: string | null
  observaciones: string | null
  definicion: DefinicionPartidoDb | string
  fue_tiempo_extra: boolean
  fue_penales: boolean
  penales_local: number | null
  penales_visitante: number | null
  equipo_ganador_id: string | null
  equipo_no_presentado_id: string | null
  partidoJugadores: Omit<PartidoJugadorActaRow, 'id'>[]
  cambios: Omit<CambioPartidoActaRow, 'id' | 'partido_id'>[]
  goles: Omit<GolActaRow, 'id' | 'partido_id'>[]
  tarjetas: Omit<TarjetaActaRow, 'id' | 'partido_id'>[]
  tieneProgramacion: boolean
  actaCerrada?: boolean
}): Promise<{ golesLocal: number; golesVisitante: number }> {
  const suspendido = input.definicion === 'suspendido'
  const walkover = input.definicion === 'walkover'
  const bloqueaEventos = suspendido || walkover

  await updateActaCabecera(input.actaId, {
    arbitro_id: input.arbitro_id,
    arbitro_nombre: input.arbitro_nombre,
    escuela_arbitral_nombre: input.escuela_arbitral_nombre,
    observaciones: input.observaciones,
    definicion: input.definicion,
    fue_tiempo_extra: input.fue_tiempo_extra,
    fue_penales: input.fue_penales,
    penales_local: input.penales_local,
    penales_visitante: input.penales_visitante,
    equipo_ganador_id: input.equipo_ganador_id,
    equipo_no_presentado_id: input.equipo_no_presentado_id,
    cerrada: input.actaCerrada ?? false,
  })

  const delPj = await supabase.from('partido_jugadores').delete().eq('partido_id', input.partidoId)
  assertNoSupabaseError(delPj, 'programacion')
  if (!bloqueaEventos && input.partidoJugadores.length) {
    const insPj = await supabase.from('partido_jugadores').insert(
      input.partidoJugadores.map((r) => ({
        partido_id: input.partidoId,
        equipo_id: r.equipo_id,
        jugador_id: r.jugador_id,
        rol: r.rol,
      })),
    )
    assertNoSupabaseError(insPj, 'programacion')
  }

  const delC = await supabase.from('cambios_partido').delete().eq('partido_id', input.partidoId)
  assertNoSupabaseError(delC, 'programacion')
  if (!bloqueaEventos && input.cambios.length) {
    const insC = await supabase.from('cambios_partido').insert(
      input.cambios.map((c) => ({
        partido_id: input.partidoId,
        equipo_id: c.equipo_id,
        jugador_sale_id: c.jugador_sale_id,
        jugador_entra_id: c.jugador_entra_id,
        minuto: c.minuto,
        observacion: c.observacion,
      })),
    )
    assertNoSupabaseError(insC, 'programacion')
  }

  const delG = await supabase.from('goles').delete().eq('partido_id', input.partidoId)
  assertNoSupabaseError(delG, 'programacion')
  if (!bloqueaEventos && input.goles.length) {
    const insG = await supabase.from('goles').insert(
      input.goles.map((g) => ({
        partido_id: input.partidoId,
        jugador_id: g.jugador_id,
        equipo_id: g.equipo_id,
        minuto: g.minuto,
        tipo_gol: g.tipo_gol ?? 'normal',
      })),
    )
    assertNoSupabaseError(insG, 'programacion')
  }

  const delT = await supabase.from('tarjetas').delete().eq('partido_id', input.partidoId)
  assertNoSupabaseError(delT, 'programacion')
  if (!bloqueaEventos && input.tarjetas.length) {
    const insT = await supabase.from('tarjetas').insert(
      input.tarjetas.map((t) => {
        const row: Record<string, unknown> = {
          partido_id: input.partidoId,
          jugador_id: t.jugador_id,
          tipo: t.tipo,
          minuto: t.minuto,
          motivo: t.motivo,
        }
        if (t.equipo_id) row.equipo_id = t.equipo_id
        return row
      }),
    )
    assertNoSupabaseError(insT, 'programacion')
  }

  const rowsForCount = bloqueaEventos ? [] : input.goles.map((g) => ({ equipo_id: g.equipo_id, tipo_gol: g.tipo_gol }))
  let { local, vis } = countGolesMarcador(rowsForCount, input.equipoLocalId, input.equipoVisitanteId)
  if (walkover && input.equipo_ganador_id) {
    local = input.equipo_ganador_id === input.equipoLocalId ? 3 : 0
    vis = input.equipo_ganador_id === input.equipoVisitanteId ? 3 : 0
  }
  const total = local + vis
  const hayMarcador = !suspendido && (total > 0 || input.definicion === 'penales' || walkover)
  const nuevoEstadoPartido = suspendido
    ? 'suspendido'
    : hayMarcador || input.definicion !== 'tiempo_reglamentario'
      ? 'jugado'
      : input.tieneProgramacion
        ? 'programado'
        : 'pendiente_programar'

  let upP = await supabase.from('partidos').update({ estado: nuevoEstadoPartido }).eq('id', input.partidoId)
  if (upP.error && suspendido) {
    console.warn('No se pudo marcar el partido como suspendido; se conserva como programado.', {
      partidoId: input.partidoId,
      error: upP.error,
    })
    upP = await supabase
      .from('partidos')
      .update({ estado: input.tieneProgramacion ? 'programado' : 'pendiente_programar' })
      .eq('id', input.partidoId)
  }
  if (upP.error) console.error('Error actualizando estado del partido desde acta', { partidoId: input.partidoId, estado: nuevoEstadoPartido, error: upP.error })
  assertNoSupabaseError(upP, 'programacion')

  if (input.tieneProgramacion) {
    const prog = await supabase.from('programaciones_partido').select('id').eq('partido_id', input.partidoId).maybeSingle()
    const pid = (prog.data as { id?: string } | null)?.id
    if (pid && nuevoEstadoPartido === 'jugado') {
      const upPr = await supabase.from('programaciones_partido').update({ estado: 'jugado' }).eq('id', pid)
      if (upPr.error) console.error('Error actualizando programaciÃ³n a jugado desde acta', { programacionId: pid, error: upPr.error })
      assertNoSupabaseError(upPr, 'programacion')
    } else if (pid && nuevoEstadoPartido === 'suspendido') {
      const upPr = await supabase.from('programaciones_partido').update({ estado: 'suspendido' }).eq('id', pid)
      if (upPr.error) {
        console.warn('No se pudo marcar la programaciÃ³n como suspendida; el acta quedÃ³ documentada.', {
          programacionId: pid,
          error: upPr.error,
        })
      }
    }
  }

  return { golesLocal: local, golesVisitante: vis }
}
