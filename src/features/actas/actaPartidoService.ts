import { supabase } from '@/lib/supabase'
import { assertNoSupabaseError } from '@/lib/supabaseErrors'
import {
  listPartidosFixtureTorneo,
  listPartidosProgramadosTorneo,
  type PartidoListaUi,
} from '@/features/partidos/partidosService'
import { isJugadoEstado } from '@/features/partidos/partidosUi'

export type GolActaRow = {
  id?: string
  partido_id: string
  jugador_id: string
  equipo_id: string
  minuto: number | null
}

export type TarjetaActaRow = {
  id?: string
  partido_id: string
  jugador_id: string
  tipo: 'amarilla' | 'roja'
}

export type ActaPartidoRow = {
  id: string
  partido_id: string
  arbitro_id: string | null
  observaciones: string | null
}

/** Partidos de la categoría: con programación o marcados como jugados en el fixture. */
export async function listPartidosParaActa(torneoId: string, categoriaId: string): Promise<PartidoListaUi[]> {
  const [programados, fixture] = await Promise.all([
    listPartidosProgramadosTorneo(torneoId),
    listPartidosFixtureTorneo(torneoId, categoriaId),
  ])
  const progCat = programados.filter((p) => p.categoriaId === categoriaId)
  const ids = new Set(progCat.map((p) => p.id))
  const jugadosExtra = fixture.filter((p) => isJugadoEstado(p.estado) && !ids.has(p.id))
  return [...progCat, ...jugadosExtra].sort((a, b) => {
    const fa = a.fecha || ''
    const fb = b.fecha || ''
    if (fa !== fb) return fa.localeCompare(fb)
    return String(a.hora).localeCompare(String(b.hora))
  })
}

export async function getOrCreateActa(partidoId: string): Promise<ActaPartidoRow> {
  const ex = await supabase.from('actas_partido').select('id, partido_id, arbitro_id, observaciones').eq('partido_id', partidoId).maybeSingle()
  const found = assertNoSupabaseError(ex, 'programacion') as ActaPartidoRow | null
  if (found) return found

  const ins = await supabase
    .from('actas_partido')
    .insert({ partido_id: partidoId })
    .select('id, partido_id, arbitro_id, observaciones')
    .single()
  return assertNoSupabaseError(ins, 'programacion') as ActaPartidoRow
}

export async function updateActaCabecera(
  actaId: string,
  patch: { arbitro_id?: string | null; observaciones?: string | null },
): Promise<void> {
  const r = await supabase.from('actas_partido').update(patch).eq('id', actaId)
  assertNoSupabaseError(r, 'programacion')
}

export async function listGolesPartido(partidoId: string): Promise<GolActaRow[]> {
  const r = await supabase.from('goles').select('id, partido_id, jugador_id, equipo_id, minuto').eq('partido_id', partidoId)
  return (assertNoSupabaseError(r, 'programacion') ?? []) as GolActaRow[]
}

export async function listTarjetasPartido(partidoId: string): Promise<TarjetaActaRow[]> {
  const r = await supabase.from('tarjetas').select('id, partido_id, jugador_id, tipo').eq('partido_id', partidoId)
  return (assertNoSupabaseError(r, 'programacion') ?? []) as TarjetaActaRow[]
}

function countGolesByEquipo(rows: GolActaRow[], equipoLocalId: string, equipoVisitanteId: string) {
  let local = 0
  let vis = 0
  for (const g of rows) {
    if (g.equipo_id === equipoLocalId) local++
    else if (g.equipo_id === equipoVisitanteId) vis++
  }
  return { local, vis }
}

export async function guardarActaCompleta(input: {
  actaId: string
  partidoId: string
  equipoLocalId: string
  equipoVisitanteId: string
  arbitro_id: string | null
  observaciones: string | null
  goles: Omit<GolActaRow, 'id' | 'partido_id'>[]
  tarjetas: Omit<TarjetaActaRow, 'id' | 'partido_id'>[]
  tieneProgramacion: boolean
}): Promise<{ golesLocal: number; golesVisitante: number }> {
  await updateActaCabecera(input.actaId, {
    arbitro_id: input.arbitro_id,
    observaciones: input.observaciones,
  })

  const delG = await supabase.from('goles').delete().eq('partido_id', input.partidoId)
  assertNoSupabaseError(delG, 'programacion')

  if (input.goles.length) {
    const insG = await supabase.from('goles').insert(
      input.goles.map((g) => ({
        partido_id: input.partidoId,
        jugador_id: g.jugador_id,
        equipo_id: g.equipo_id,
        minuto: g.minuto,
      })),
    )
    assertNoSupabaseError(insG, 'programacion')
  }

  const delT = await supabase.from('tarjetas').delete().eq('partido_id', input.partidoId)
  assertNoSupabaseError(delT, 'programacion')

  if (input.tarjetas.length) {
    const insT = await supabase.from('tarjetas').insert(
      input.tarjetas.map((t) => ({
        partido_id: input.partidoId,
        jugador_id: t.jugador_id,
        tipo: t.tipo,
      })),
    )
    assertNoSupabaseError(insT, 'programacion')
  }

  const { local, vis } = countGolesByEquipo(
    input.goles.map((g) => ({ ...g, partido_id: input.partidoId })),
    input.equipoLocalId,
    input.equipoVisitanteId,
  )
  const total = local + vis
  const nuevoEstado =
    total > 0 ? 'jugado' : input.tieneProgramacion ? 'programado' : 'pendiente_programar'

  const upP = await supabase.from('partidos').update({ estado: nuevoEstado }).eq('id', input.partidoId)
  assertNoSupabaseError(upP, 'programacion')

  return { golesLocal: local, golesVisitante: vis }
}
