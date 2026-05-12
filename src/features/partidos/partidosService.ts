import { supabase } from '@/lib/supabase'
import { throwOnError } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import { formatHoraUi, normalizeHoraDb } from '@/features/horarios/horariosService'
import { mapVwPartidoRow, type PartidoDashboardUi } from '@/features/partidos/partidosUi'

export { deletePartidoCascade } from '@/features/partidos/partidoCleanup'

export type PartidoListaUi = PartidoDashboardUi & { jornada: number }

export type PartidosTorneoBundle = {
  fixture: PartidoListaUi[]
  programados: PartidoListaUi[]
}

type PartidoRowDb = {
  id: string
  torneo_id: string
  categoria_id: string
  jornada: number | null
  fecha_fixture: string | null
  estado: string
  equipo_local_id: string
  equipo_visitante_id: string
}

function addMinutesToTime(hora: string, mins: number): string {
  const n = normalizeHoraDb(hora.trim() || '12:00')
  const [h, m, s] = n.split(':').map((x) => Number(x))
  if (Number.isNaN(h) || Number.isNaN(m)) return '13:30:00'
  let total = h * 60 + m + mins
  total = Math.min(total, 24 * 60 - 1)
  const nh = Math.floor(total / 60)
  const nm = total % 60
  const sec = Number.isFinite(s) ? s : 0
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Fixture puro: tabla partidos + equipos/categorías. Sin vw_partidos_detalle (evita mezclar programación). */
export async function listPartidosFixtureTorneo(
  torneoId: string,
  categoriaId?: string,
): Promise<PartidoListaUi[]> {
  const p = await supabase
    .from('partidos')
    .select(
      'id, torneo_id, categoria_id, jornada, fecha_fixture, estado, equipo_local_id, equipo_visitante_id',
    )
    .eq('torneo_id', torneoId)
    .order('categoria_id', { ascending: true })
    .order('jornada', { ascending: true })
    .order('orden', { ascending: true })

  let rows = throwOnError(p) as PartidoRowDb[]
  if (categoriaId) rows = rows.filter((r) => r.categoria_id === categoriaId)
  if (!rows.length) return []

  const catIds = [...new Set(rows.map((x) => x.categoria_id))]
  const teamIds = new Set<string>()
  for (const x of rows) {
    teamIds.add(x.equipo_local_id)
    teamIds.add(x.equipo_visitante_id)
  }

  const [cats, teams] = await Promise.all([
    supabase.from('categorias').select('id, nombre, color').in('id', catIds),
    supabase.from('equipos').select('id, nombre, logo_url, color').in('id', [...teamIds]),
  ])

  const catMap = new Map(
    (throwOnError(cats) as { id: string; nombre: string; color: string | null }[]).map((c) => [c.id, c]),
  )
  const teamMap = new Map(
    (throwOnError(teams) as { id: string; nombre: string; logo_url: string | null; color: string | null }[]).map(
      (t) => [t.id, t],
    ),
  )

  return rows.map((x) => {
    const cat = catMap.get(x.categoria_id)
    const tl = teamMap.get(x.equipo_local_id)
    const tv = teamMap.get(x.equipo_visitante_id)
    return {
      id: x.id,
      fecha: x.fecha_fixture ?? '',
      hora: '',
      horaFin: '',
      cancha: '',
      canchaId: null,
      estado: x.estado,
      categoriaId: x.categoria_id,
      categoriaNombre: cat?.nombre ?? '',
      categoriaColor: cat?.color ?? '#64748b',
      equipoLocalNombre: tl?.nombre ?? '—',
      equipoVisitanteNombre: tv?.nombre ?? '—',
      equipoLocalLogoUrl: tl?.logo_url ?? null,
      equipoVisitanteLogoUrl: tv?.logo_url ?? null,
      golesLocal: null,
      golesVisitante: null,
      equipoLocalId: x.equipo_local_id,
      equipoVisitanteId: x.equipo_visitante_id,
      jornada: x.jornada ?? 0,
      programacionId: null,
    }
  })
}

/** Partidos con fila en programaciones_partido (fecha/cancha/hora reales). */
export async function listPartidosProgramadosTorneo(torneoId: string): Promise<PartidoListaUi[]> {
  const parRes = await supabase.from('partidos').select('id').eq('torneo_id', torneoId)
  if (parRes.error) throw toUserError(parRes.error, 'programacion')
  const partidoIds = (parRes.data ?? []).map((r: { id: string }) => r.id)
  if (!partidoIds.length) return []

  const progRes = await supabase.from('programaciones_partido').select('*').in('partido_id', partidoIds)
  if (progRes.error) throw toUserError(progRes.error, 'programacion')
  const prows = (progRes.data ?? []) as Record<string, unknown>[]
  if (!prows.length) return []

  const pidSet = new Set(prows.map((r) => String(r.partido_id ?? '')))
  const partidosRes = await supabase
    .from('partidos')
    .select('id, torneo_id, categoria_id, jornada, fecha_fixture, estado, equipo_local_id, equipo_visitante_id')
    .in('id', [...pidSet])
  const partRows = throwOnError(partidosRes) as PartidoRowDb[]
  const partMap = new Map(partRows.map((pr) => [pr.id, pr]))

  const canchaIds = [...new Set(prows.map((r) => String(r.cancha_id ?? '')).filter(Boolean))]
  let canchaMap = new Map<string, string>()
  if (canchaIds.length) {
    const cRes = await supabase.from('canchas').select('id, nombre').in('id', canchaIds)
    if (!cRes.error && cRes.data) {
      canchaMap = new Map((cRes.data as { id: string; nombre: string }[]).map((c) => [c.id, c.nombre]))
    }
  }

  const catIds = [...new Set(partRows.map((pr) => pr.categoria_id))]
  const teamIds = new Set<string>()
  for (const pr of partRows) {
    teamIds.add(pr.equipo_local_id)
    teamIds.add(pr.equipo_visitante_id)
  }
  const [cats, teams] = await Promise.all([
    supabase.from('categorias').select('id, nombre, color').in('id', catIds),
    supabase.from('equipos').select('id, nombre, logo_url, color').in('id', [...teamIds]),
  ])
  const catMap = new Map(
    (throwOnError(cats) as { id: string; nombre: string; color: string | null }[]).map((c) => [c.id, c]),
  )
  const teamMap = new Map(
    (throwOnError(teams) as { id: string; nombre: string; logo_url: string | null; color: string | null }[]).map(
      (t) => [t.id, t],
    ),
  )

  const out: PartidoListaUi[] = []
  for (const r of prows) {
    const partidoId = String(r.partido_id ?? '')
    const pr = partMap.get(partidoId)
    if (!pr) continue
    const cat = catMap.get(pr.categoria_id)
    const tl = teamMap.get(pr.equipo_local_id)
    const tv = teamMap.get(pr.equipo_visitante_id)
    const fecha = String(r.fecha ?? '').slice(0, 10)
    const hi = String(r.hora_inicio ?? '')
    const hf = String(r.hora_fin ?? '')
    const canchaId = String(r.cancha_id ?? '')
    const canchaNombre = canchaMap.get(canchaId) ?? '—'
    out.push({
      id: pr.id,
      programacionId: String(r.id ?? ''),
      fecha,
      hora: formatHoraUi(hi),
      horaFin: formatHoraUi(hf),
      cancha: canchaNombre,
      canchaId: canchaId || null,
      estado: String(r.estado ?? pr.estado),
      categoriaId: pr.categoria_id,
      categoriaNombre: cat?.nombre ?? '',
      categoriaColor: cat?.color ?? '#64748b',
      equipoLocalNombre: tl?.nombre ?? '—',
      equipoVisitanteNombre: tv?.nombre ?? '—',
      equipoLocalLogoUrl: tl?.logo_url ?? null,
      equipoVisitanteLogoUrl: tv?.logo_url ?? null,
      golesLocal: null,
      golesVisitante: null,
      equipoLocalId: pr.equipo_local_id,
      equipoVisitanteId: pr.equipo_visitante_id,
      jornada: pr.jornada ?? 0,
    })
  }
  return out.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
}

export async function loadPartidosTorneoBundle(torneoId: string): Promise<PartidosTorneoBundle> {
  const [fixture, programados] = await Promise.all([
    listPartidosFixtureTorneo(torneoId),
    listPartidosProgramadosTorneo(torneoId),
  ])
  return { fixture, programados }
}

/** @deprecated Prefer loadPartidosTorneoBundle; devuelve solo fixture sin mezclar programación. */
export async function listPartidosTorneo(torneoId: string): Promise<PartidoListaUi[]> {
  return listPartidosFixtureTorneo(torneoId)
}

export async function listPartidosTorneoCategoria(torneoId: string, categoriaId: string): Promise<PartidoListaUi[]> {
  return listPartidosFixtureTorneo(torneoId, categoriaId)
}

export function groupByFecha(partidos: PartidoListaUi[]): Record<string, PartidoListaUi[]> {
  const acc: Record<string, PartidoListaUi[]> = {}
  for (const p of partidos) {
    const f = p.fecha || 'sin-fecha'
    if (!acc[f]) acc[f] = []
    acc[f].push(p)
  }
  return acc
}

/** Cruce por misma fecha, misma cancha (nombre o id) y mismo horario de inicio. */
export function findConflictsPorFecha(partidosPorFecha: Record<string, PartidoListaUi[]>): string[] {
  const conflictIds: string[] = []
  for (const fecha of Object.keys(partidosPorFecha)) {
    const list = partidosPorFecha[fecha] ?? []
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p1 = list[i]!
        const p2 = list[j]!
        const mismoSlot =
          p1.hora &&
          p2.hora &&
          p1.hora === p2.hora &&
          (p1.cancha || p1.canchaId) &&
          (p2.cancha || p2.canchaId) &&
          (p1.cancha === p2.cancha || (p1.canchaId && p1.canchaId === p2.canchaId))
        if (mismoSlot) {
          conflictIds.push(p1.id, p2.id)
        }
      }
    }
  }
  return [...new Set(conflictIds)]
}

export async function countPartidosEnCategoria(categoriaId: string): Promise<number> {
  const r = await supabase.from('partidos').select('id', { count: 'exact', head: true }).eq('categoria_id', categoriaId)
  if (r.error) throw toUserError(r.error, 'fixture')
  return r.count ?? 0
}

export async function generarFixtureCategoria(categoriaId: string, fechaInicio: string): Promise<void> {
  const variants: Record<string, unknown>[] = [
    { p_categoria_id: categoriaId, p_fecha_inicio: fechaInicio },
    { categoria_id: categoriaId, fecha_inicio: fechaInicio },
  ]
  let last: unknown = null
  for (const args of variants) {
    const { error } = await supabase.rpc('generar_fixture_categoria', args)
    if (!error) return
    last = error
  }
  throw toUserError(last, 'fixture')
}

export type PartidoFixturePatch = {
  jornada?: number | null
  fecha_fixture?: string | null
  equipo_local_id?: string
  equipo_visitante_id?: string
  estado?: string
}

export async function updatePartido(partidoId: string, patch: PartidoFixturePatch): Promise<void> {
  const r = await supabase.from('partidos').update(patch).eq('id', partidoId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

export type PartidoInsertInput = {
  torneo_id: string
  categoria_id: string
  equipo_local_id: string
  equipo_visitante_id: string
  jornada?: number | null
  fecha_fixture?: string | null
}

export async function createPartidoManual(input: PartidoInsertInput): Promise<string> {
  const r = await supabase
    .from('partidos')
    .insert({
      torneo_id: input.torneo_id,
      categoria_id: input.categoria_id,
      equipo_local_id: input.equipo_local_id,
      equipo_visitante_id: input.equipo_visitante_id,
      jornada: input.jornada ?? 1,
      fecha_fixture: input.fecha_fixture ?? null,
      estado: 'pendiente_programar',
      fase: 'regular',
      orden: 0,
    })
    .select('id')
    .single()
  if (r.error) throw toUserError(r.error, 'fixture')
  return (r.data as { id: string }).id
}

export type ProgramacionInput = {
  partido_id: string
  cancha_id: string
  fecha: string
  hora_inicio: string
  hora_fin?: string
}

export async function upsertProgramacion(
  programacionId: string | null,
  input: ProgramacionInput,
): Promise<void> {
  const horaInicio = normalizeHoraDb(input.hora_inicio)
  const horaFin = normalizeHoraDb(input.hora_fin ?? addMinutesToTime(horaInicio, 90))

  if (programacionId) {
    const r = await supabase
      .from('programaciones_partido')
      .update({
        cancha_id: input.cancha_id,
        fecha: input.fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      })
      .eq('id', programacionId)
    if (r.error) throw toUserError(r.error, 'programacion')
    return
  }

  const r = await supabase.from('programaciones_partido').insert({
    partido_id: input.partido_id,
    cancha_id: input.cancha_id,
    fecha: input.fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    estado: 'programado',
  })
  if (r.error) throw toUserError(r.error, 'programacion')
}

export async function deleteProgramacion(programacionId: string): Promise<void> {
  const r = await supabase.from('programaciones_partido').delete().eq('id', programacionId)
  if (r.error) throw toUserError(r.error, 'programacion')
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function hayCruce(
  ocupadas: { fecha: string; canchaId: string; hora: string }[],
  fecha: string,
  canchaId: string,
  hora: string,
): boolean {
  return ocupadas.some((o) => o.fecha === fecha && o.canchaId === canchaId && o.hora === hora)
}

export async function sorteoProgramacionesTorneoCategoria(
  torneoId: string,
  categoriaId: string,
  opts: { fechaInicio: string; dias: number },
): Promise<{ creadas: number }> {
  const canchas = throwOnError(
    await supabase.from('canchas').select('id').eq('torneo_id', torneoId).eq('activa', true),
  ) as { id: string }[]
  const horarios = throwOnError(
    await supabase.from('horarios').select('hora').eq('torneo_id', torneoId).eq('activo', true),
  ) as { hora: string }[]

  if (!canchas.length) {
    throw new Error('Agrega al menos una cancha activa en Configuración antes de sortear horarios.')
  }
  if (!horarios.length) {
    throw new Error('Agrega al menos un horario en Configuración antes de sortear.')
  }

  const fixture = await listPartidosFixtureTorneo(torneoId, categoriaId)
  const prog = await listPartidosProgramadosTorneo(torneoId)
  const ya = new Set(prog.map((p) => p.id))
  const pendientes = fixture.filter((p) => !ya.has(p.id))
  if (!pendientes.length) return { creadas: 0 }

  const ocupadas = prog
    .filter((p) => p.canchaId && p.fecha && p.hora)
    .map((p) => ({ fecha: p.fecha, canchaId: p.canchaId!, hora: p.hora }))

  const shuffled = [...pendientes].sort(() => Math.random() - 0.5)
  let creadas = 0

  for (const p of shuffled) {
    let colocado = false
    for (let d = 0; d < opts.dias && !colocado; d++) {
      const fecha = addDaysToIsoDate(opts.fechaInicio, d)
      const ordenCanchas = [...canchas].sort(() => Math.random() - 0.5)
      const ordenHoras = [...horarios].sort(() => Math.random() - 0.5)
      for (const c of ordenCanchas) {
        for (const h of ordenHoras) {
          const hora = formatHoraUi(normalizeHoraDb(String(h.hora)))
          if (hayCruce(ocupadas, fecha, c.id, hora)) continue
          await upsertProgramacion(null, {
            partido_id: p.id,
            cancha_id: c.id,
            fecha,
            hora_inicio: hora,
          })
          ocupadas.push({ fecha, canchaId: c.id, hora })
          creadas++
          colocado = true
          break
        }
        if (colocado) break
      }
    }
    if (!colocado) {
      throw new Error(
        'No hay suficientes combinaciones de fecha, cancha y hora sin cruce. Amplía el rango de días o revisa horarios en Configuración.',
      )
    }
  }

  return { creadas }
}

/** Lista enriquecida desde vista (dashboard legacy). */
export async function listPartidosVistaDetalle(torneoId: string): Promise<PartidoListaUi[]> {
  const v = await supabase.from('vw_partidos_detalle').select('*').eq('torneo_id', torneoId)
  if (v.error || !v.data?.length) return listPartidosFixtureTorneo(torneoId)
  return (v.data as Record<string, unknown>[]).map((row) => {
    const base = mapVwPartidoRow(row)
    return { ...base, jornada: Number(row.jornada ?? row.numero_jornada ?? 0) || 0 }
  })
}
