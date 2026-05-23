import { supabase } from '@/lib/supabase'
import { pickStr, throwOnError } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import { formatHoraUi, HORA_FRANJAS_PREDETERMINADAS, normalizeHoraDb } from '@/features/horarios/horariosService'
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
  orden: number | null
  fecha_fixture: string | null
  estado: string
  equipo_local_id: string
  equipo_visitante_id: string
  fase_torneo_id?: string | null
  grupo_id?: string | null
}

type PartidoResultadoRow = {
  partido_id?: string | null
  id?: string | null
  marcador_local?: number | string | null
  marcador_visitante?: number | string | null
  resultado_nota?: string | null
  definicion?: string | null
  equipo_ganador_id?: string | null
  equipo_no_presentado_id?: string | null
}

const DUPLICATE_MATCH_MSG = 'Este partido ya existe en otra jornada. Solo puede repetirse si el torneo es de ida y vuelta.'

function sameFixtureFase(a?: string | null, b?: string | null): boolean {
  return (a || null) === (b || null)
}

function sameUnorderedMatch(aLocal: string, aVisit: string, bLocal: string, bVisit: string): boolean {
  return (
    (aLocal === bLocal && aVisit === bVisit) ||
    (aLocal === bVisit && aVisit === bLocal)
  )
}

async function assertPartidoFixtureValido(input: {
  categoria_id: string
  equipo_local_id: string
  equipo_visitante_id: string
  fase_torneo_id?: string | null
  excluirPartidoId?: string | null
  permiteIdaVuelta?: boolean
}): Promise<void> {
  if (!input.equipo_local_id || !input.equipo_visitante_id || input.equipo_local_id === input.equipo_visitante_id) {
    throw new Error('Selecciona equipos local y visitante distintos.')
  }
  if (input.permiteIdaVuelta) return

  const r = await supabase
    .from('partidos')
    .select('id, jornada, equipo_local_id, equipo_visitante_id, fase_torneo_id')
    .eq('categoria_id', input.categoria_id)
  if (r.error) throw toUserError(r.error, 'fixture')

  const rows = (r.data ?? []) as Pick<PartidoRowDb, 'id' | 'jornada' | 'equipo_local_id' | 'equipo_visitante_id' | 'fase_torneo_id'>[]
  const duplicate = rows.some((row) => {
    if (input.excluirPartidoId && row.id === input.excluirPartidoId) return false
    if (!sameFixtureFase(row.fase_torneo_id, input.fase_torneo_id)) return false
    return sameUnorderedMatch(input.equipo_local_id, input.equipo_visitante_id, row.equipo_local_id, row.equipo_visitante_id)
  })
  if (duplicate) throw new Error(DUPLICATE_MATCH_MSG)
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
      'id, torneo_id, categoria_id, jornada, orden, fecha_fixture, estado, equipo_local_id, equipo_visitante_id, fase_torneo_id, grupo_id',
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
    supabase.from('equipos').select('id, nombre, logo_url, logo_public_id, color').in('id', [...teamIds]),
  ])

  const catMap = new Map(
    (throwOnError(cats) as { id: string; nombre: string; color: string | null }[]).map((c) => [c.id, c]),
  )
  const teamMap = new Map(
    (
      throwOnError(teams) as {
        id: string
        nombre: string
        logo_url: string | null
        logo_public_id: string | null
        color: string | null
      }[]
    ).map((t) => [t.id, t]),
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
      equipoLocalLogoPublicId: tl?.logo_public_id ?? null,
      equipoVisitanteLogoPublicId: tv?.logo_public_id ?? null,
      golesLocal: null,
      golesVisitante: null,
      equipoLocalId: x.equipo_local_id,
      equipoVisitanteId: x.equipo_visitante_id,
      jornada: x.jornada ?? 0,
      orden: x.orden ?? 0,
      programacionId: null,
      faseTorneoId: x.fase_torneo_id ?? null,
      grupoId: x.grupo_id ?? null,
    }
  })
}

async function applyResultadosPartidos<T extends PartidoListaUi>(partidos: T[]): Promise<T[]> {
  const ids = [...new Set(partidos.map((p) => p.id).filter(Boolean))]
  if (!ids.length) return partidos

  const res = await supabase
    .from('vw_partidos_resultado_detalle')
    .select('partido_id, marcador_local, marcador_visitante, resultado_nota, definicion, equipo_ganador_id, equipo_no_presentado_id')
    .in('partido_id', ids)

  if (res.error || !res.data?.length) {
    if (res.error) console.error('Error cargando resultados de partidos', { ids, error: res.error })
    return partidos
  }

  const byPartido = new Map<string, PartidoResultadoRow>()
  for (const row of res.data as PartidoResultadoRow[]) {
    const partidoId = String(row.partido_id ?? row.id ?? '')
    if (partidoId) byPartido.set(partidoId, row)
  }

  return partidos.map((partido) => {
    const row = byPartido.get(partido.id)
    if (!row) return partido
    const rowRecord = row as Record<string, unknown>
    const marcadorLocalRaw = rowRecord.marcador_local
    const marcadorVisitanteRaw = rowRecord.marcador_visitante
    const marcadorLocal =
      marcadorLocalRaw == null || marcadorLocalRaw === '' ? null : Number(marcadorLocalRaw)
    const marcadorVisitante =
      marcadorVisitanteRaw == null || marcadorVisitanteRaw === '' ? null : Number(marcadorVisitanteRaw)
    return {
      ...partido,
      golesLocal: Number.isFinite(marcadorLocal) ? marcadorLocal : partido.golesLocal,
      golesVisitante: Number.isFinite(marcadorVisitante) ? marcadorVisitante : partido.golesVisitante,
      definicion: pickStr(rowRecord, 'definicion') || partido.definicion || null,
      resultadoNota: pickStr(rowRecord, 'resultado_nota') || partido.resultadoNota || null,
      equipoGanadorId: pickStr(rowRecord, 'equipo_ganador_id') || partido.equipoGanadorId || null,
      equipoNoPresentadoId: pickStr(rowRecord, 'equipo_no_presentado_id') || partido.equipoNoPresentadoId || null,
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
    .select(
      'id, torneo_id, categoria_id, jornada, orden, fecha_fixture, estado, equipo_local_id, equipo_visitante_id, fase_torneo_id, grupo_id',
    )
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
    supabase.from('equipos').select('id, nombre, logo_url, logo_public_id, color').in('id', [...teamIds]),
  ])
  const catMap = new Map(
    (throwOnError(cats) as { id: string; nombre: string; color: string | null }[]).map((c) => [c.id, c]),
  )
  const teamMap = new Map(
    (
      throwOnError(teams) as {
        id: string
        nombre: string
        logo_url: string | null
        logo_public_id: string | null
        color: string | null
      }[]
    ).map((t) => [t.id, t]),
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
    const observaciones = r.observaciones != null ? String(r.observaciones) : null
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
      equipoLocalLogoPublicId: tl?.logo_public_id ?? null,
      equipoVisitanteLogoPublicId: tv?.logo_public_id ?? null,
      golesLocal: null,
      golesVisitante: null,
      equipoLocalId: pr.equipo_local_id,
      equipoVisitanteId: pr.equipo_visitante_id,
      jornada: pr.jornada ?? 0,
      orden: pr.orden ?? 0,
      observaciones,
      faseTorneoId: pr.fase_torneo_id ?? null,
      grupoId: pr.grupo_id ?? null,
    })
  }

  const idsOut = out.map((o) => o.id)
  if (idsOut.length) {
    const golRes = await supabase.from('goles').select('partido_id, equipo_id, tipo_gol').in('partido_id', idsOut)
    if (!golRes.error && golRes.data?.length) {
      const byPartido = new Map<string, { l: number; v: number }>()
      for (const o of out) {
        const pr = partMap.get(o.id)
        if (pr) byPartido.set(o.id, { l: 0, v: 0 })
      }
      for (const g of golRes.data as { partido_id: string; equipo_id: string; tipo_gol?: string | null }[]) {
        const pr = partMap.get(g.partido_id)
        if (!pr) continue
        const cur = byPartido.get(g.partido_id) ?? { l: 0, v: 0 }
        const tipo = (g.tipo_gol ?? 'normal').toLowerCase()
        if (tipo === 'autogol') {
          if (g.equipo_id === pr.equipo_local_id) cur.v++
          else if (g.equipo_id === pr.equipo_visitante_id) cur.l++
        } else {
          if (g.equipo_id === pr.equipo_local_id) cur.l++
          else if (g.equipo_id === pr.equipo_visitante_id) cur.v++
        }
        byPartido.set(g.partido_id, cur)
      }
      for (const o of out) {
        const c = byPartido.get(o.id)
        if (c) {
          o.golesLocal = c.l
          o.golesVisitante = c.v
        }
      }
    }
  }

  return out.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
}

export async function loadPartidosTorneoBundle(torneoId: string): Promise<PartidosTorneoBundle> {
  const [fixtureRaw, programados] = await Promise.all([
    listPartidosFixtureTorneo(torneoId),
    listPartidosProgramadosTorneo(torneoId),
  ])
  const progByPartido = new Map(programados.map((p) => [p.id, p]))
  const fixture = fixtureRaw.map((f) => {
    const pr = progByPartido.get(f.id)
    if (!pr) return f
    return {
      ...f,
      programacionId: pr.programacionId ?? null,
      fecha: pr.fecha || f.fecha,
      hora: pr.hora || '',
      horaFin: pr.horaFin ?? '',
      cancha: pr.cancha || '',
      canchaId: pr.canchaId ?? null,
      observaciones: pr.observaciones ?? null,
      estadoProgramacion: pr.estado,
    }
  })
  const [fixtureConResultados, programadosConResultados] = await Promise.all([
    applyResultadosPartidos(fixture),
    applyResultadosPartidos(programados),
  ])
  return { fixture: fixtureConResultados, programados: programadosConResultados }
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

export async function countPartidosEnFase(faseTorneoId: string): Promise<number> {
  const r = await supabase.from('partidos').select('id', { count: 'exact', head: true }).eq('fase_torneo_id', faseTorneoId)
  if (r.error) throw toUserError(r.error, 'fixture')
  return r.count ?? 0
}

export async function generarFixtureCategoria(categoriaId: string, _fechaInicioLegacy?: string | null): Promise<void> {
  const variants: Record<string, unknown>[] = [
    { p_categoria_id: categoriaId },
    { categoria_id: categoriaId },
    { p_categoria_id: categoriaId, p_fecha_inicio: null },
    { categoria_id: categoriaId, fecha_inicio: null },
  ]
  let last: unknown = null
  for (const args of variants) {
    const { error } = await supabase.rpc('generar_fixture_categoria', args)
    if (!error) return
    last = error
  }
  throw toUserError(last, 'fixture')
}

export async function eliminarPartidoFixtureSeguro(partidoId: string, forzar = false): Promise<void> {
  const { error } = await supabase.rpc('eliminar_partido_fixture_seguro', {
    p_partido_id: partidoId,
    p_forzar: forzar,
  })
  if (error) throw toUserError(error, 'fixture')
}

export async function eliminarJornadaFixtureSeguro(params: {
  categoriaId: string
  faseTorneoId?: string | null
  jornada: number
  grupoId?: string | null
  forzar?: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('eliminar_jornada_fixture_seguro', {
    p_categoria_id: params.categoriaId,
    p_fase_torneo_id: params.faseTorneoId ?? null,
    p_jornada: params.jornada,
    p_grupo_id: params.grupoId ?? null,
    p_forzar: Boolean(params.forzar),
  })
  if (error) throw toUserError(error, 'fixture')
}

export async function eliminarFixtureFaseSeguro(params: {
  categoriaId: string
  faseTorneoId?: string | null
  forzar?: boolean
}): Promise<void> {
  const { error } = await supabase.rpc('eliminar_fixture_fase_seguro', {
    p_categoria_id: params.categoriaId,
    p_fase_torneo_id: params.faseTorneoId ?? null,
    p_forzar: Boolean(params.forzar),
  })
  if (error) throw toUserError(error, 'fixture')
}

const CRUCE_CANCHA_HORARIO_MSG = 'Ya existe un partido programado en esa cancha durante ese horario.'

async function assertSlotProgramacionLibre(params: {
  cancha_id: string
  fecha: string
  hora_inicio_db: string
  excluirProgramacionId?: string | null
}): Promise<void> {
  const { data, error } = await supabase
    .from('programaciones_partido')
    .select('id')
    .eq('cancha_id', params.cancha_id)
    .eq('fecha', params.fecha)
    .eq('hora_inicio', params.hora_inicio_db)
  if (error) throw toUserError(error, 'programacion')
  const rows = (data ?? []) as { id: string }[]
  const ex = params.excluirProgramacionId
  const ocupado = rows.some((row) => !ex || row.id !== ex)
  if (ocupado) {
    throw new Error(CRUCE_CANCHA_HORARIO_MSG)
  }
}

export type PartidoFixturePatch = {
  jornada?: number | null
  fecha_fixture?: string | null
  orden?: number | null
  equipo_local_id?: string
  equipo_visitante_id?: string
  estado?: string
  grupo_id?: string | null
}

export async function updatePartido(partidoId: string, patch: PartidoFixturePatch): Promise<void> {
  const currentRes = await supabase
    .from('partidos')
    .select('id, torneo_id, categoria_id, jornada, orden, fecha_fixture, estado, equipo_local_id, equipo_visitante_id, fase_torneo_id, grupo_id')
    .eq('id', partidoId)
    .single()
  if (currentRes.error) throw toUserError(currentRes.error, 'fixture')
  const current = currentRes.data as PartidoRowDb
  await assertPartidoFixtureValido({
    categoria_id: current.categoria_id,
    equipo_local_id: patch.equipo_local_id ?? current.equipo_local_id,
    equipo_visitante_id: patch.equipo_visitante_id ?? current.equipo_visitante_id,
    fase_torneo_id: current.fase_torneo_id ?? null,
    excluirPartidoId: partidoId,
  })
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
  orden?: number | null
  fase_torneo_id?: string | null
  grupo_id?: string | null
}

export async function createPartidoManual(input: PartidoInsertInput): Promise<string> {
  const j = input.jornada ?? 1
  await assertPartidoFixtureValido({
    categoria_id: input.categoria_id,
    equipo_local_id: input.equipo_local_id,
    equipo_visitante_id: input.equipo_visitante_id,
    fase_torneo_id: input.fase_torneo_id ?? null,
  })
  let orden = 0
  if (input.orden != null && !Number.isNaN(Number(input.orden)) && Number(input.orden) > 0) {
    orden = Number(input.orden)
  } else {
    let maxQBuilder = supabase
      .from('partidos')
      .select('orden')
      .eq('categoria_id', input.categoria_id)
      .eq('jornada', j)
      .order('orden', { ascending: false })
      .limit(1)
    if (input.fase_torneo_id) maxQBuilder = maxQBuilder.eq('fase_torneo_id', input.fase_torneo_id)
    if (input.grupo_id) maxQBuilder = maxQBuilder.eq('grupo_id', input.grupo_id)
    else maxQBuilder = maxQBuilder.is('grupo_id', null)
    const maxQ = await maxQBuilder
    if (!maxQ.error && maxQ.data?.[0]) {
      orden = (Number((maxQ.data[0] as { orden: number | null }).orden) || 0) + 1
    }
  }

  const r = await supabase
    .from('partidos')
    .insert({
      torneo_id: input.torneo_id,
      categoria_id: input.categoria_id,
      equipo_local_id: input.equipo_local_id,
      equipo_visitante_id: input.equipo_visitante_id,
      jornada: j,
      fecha_fixture: input.fecha_fixture ?? null,
      estado: 'pendiente_programar',
      fase: 'regular',
      orden,
      fase_torneo_id: input.fase_torneo_id ?? null,
      grupo_id: input.grupo_id ?? null,
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
  estado?: string
  observaciones?: string | null
}

async function resolveProgramacionIdForPartido(
  partidoId: string,
  programacionId: string | null | undefined,
): Promise<string | null> {
  if (programacionId) return programacionId
  const r = await supabase.from('programaciones_partido').select('id').eq('partido_id', partidoId).maybeSingle()
  if (r.error) throw toUserError(r.error, 'programacion')
  const id = (r.data as { id?: string } | null)?.id
  return id ? String(id) : null
}

export async function upsertProgramacion(
  programacionId: string | null,
  input: ProgramacionInput,
): Promise<void> {
  const horaInicio = normalizeHoraDb(input.hora_inicio)
  const horaFin = normalizeHoraDb(input.hora_fin ?? addMinutesToTime(horaInicio, 90))

  const resolvedId = await resolveProgramacionIdForPartido(input.partido_id, programacionId)

  await assertSlotProgramacionLibre({
    cancha_id: input.cancha_id,
    fecha: input.fecha,
    hora_inicio_db: horaInicio,
    excluirProgramacionId: resolvedId,
  })

  const estadoProg = (input.estado ?? 'programado').trim() || 'programado'
  const obs = input.observaciones?.trim() ? input.observaciones!.trim() : null

  if (resolvedId) {
    const r = await supabase
      .from('programaciones_partido')
      .update({
        cancha_id: input.cancha_id,
        fecha: input.fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        estado: estadoProg,
        observaciones: obs,
      })
      .eq('id', resolvedId)
    if (r.error) throw toUserError(r.error, 'programacion')
    return
  }

  const r = await supabase.from('programaciones_partido').insert({
    partido_id: input.partido_id,
    cancha_id: input.cancha_id,
    fecha: input.fecha,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    estado: estadoProg,
    observaciones: obs,
  })
  if (r.error) throw toUserError(r.error, 'programacion')
}

export async function deleteProgramacion(programacionId: string): Promise<void> {
  const r = await supabase.from('programaciones_partido').delete().eq('id', programacionId)
  if (r.error) throw toUserError(r.error, 'programacion')
}

async function countByPartidos(table: string, partidoIds: string[]): Promise<number> {
  if (!partidoIds.length) return 0
  const r = await supabase.from(table).select('id', { count: 'exact', head: true }).in('partido_id', partidoIds)
  if (r.error) throw toUserError(r.error, 'fixture')
  return r.count ?? 0
}

export type JornadaDeleteSummary = {
  partidos: number
  jugados: number
  programaciones: number
  actas: number
  goles: number
  tarjetas: number
  tieneInformacionAsociada: boolean
}

export async function getJornadaDeleteSummary(params: {
  torneoId?: string
  categoriaId: string
  jornada: number
  faseTorneoId?: string | null
}): Promise<JornadaDeleteSummary> {
  let q = supabase
    .from('partidos')
    .select('id, estado, fase_torneo_id')
    .eq('categoria_id', params.categoriaId)
    .eq('jornada', params.jornada)
  if (params.torneoId) q = q.eq('torneo_id', params.torneoId)

  const r = await q
  if (r.error) throw toUserError(r.error, 'fixture')
  const rows = ((r.data ?? []) as { id: string; estado: string; fase_torneo_id?: string | null }[]).filter((row) =>
    params.faseTorneoId ? sameFixtureFase(row.fase_torneo_id ?? null, params.faseTorneoId) : true,
  )
  const ids = rows.map((row) => row.id)
  const [programaciones, actas, goles, tarjetas] = await Promise.all([
    countByPartidos('programaciones_partido', ids),
    countByPartidos('actas_partido', ids),
    countByPartidos('goles', ids),
    countByPartidos('tarjetas', ids),
  ])
  const jugados = rows.filter((row) => row.estado?.toLowerCase().includes('jugad') || row.estado === 'finalizado').length
  return {
    partidos: ids.length,
    jugados,
    programaciones,
    actas,
    goles,
    tarjetas,
    tieneInformacionAsociada: jugados > 0 || programaciones > 0 || actas > 0 || goles > 0 || tarjetas > 0,
  }
}

async function deletePartidosDependenciasMasivo(partidoIds: string[]): Promise<void> {
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
    if (r.error) throw toUserError(r.error, 'fixture')
  }
}

export async function deleteJornadaCompleta(params: {
  torneoId?: string
  categoriaId: string
  jornada: number
  faseTorneoId?: string | null
}): Promise<void> {
  let q = supabase
    .from('partidos')
    .select('id, fase_torneo_id')
    .eq('categoria_id', params.categoriaId)
    .eq('jornada', params.jornada)
  if (params.torneoId) q = q.eq('torneo_id', params.torneoId)
  const r = await q
  if (r.error) throw toUserError(r.error, 'fixture')
  const ids = ((r.data ?? []) as { id: string; fase_torneo_id?: string | null }[])
    .filter((row) => (params.faseTorneoId ? sameFixtureFase(row.fase_torneo_id ?? null, params.faseTorneoId) : true))
    .map((row) => row.id)

  await deletePartidosDependenciasMasivo(ids)
}

export async function updatePartidosJornada(
  updates: { id: string; jornada: number; orden: number }[],
): Promise<void> {
  for (const update of updates) {
    const r = await supabase
      .from('partidos')
      .update({ jornada: update.jornada, orden: update.orden })
      .eq('id', update.id)
    if (r.error) throw toUserError(r.error, 'fixture')
  }
}

export async function assignPartidosCategoriaSinFase(categoriaId: string, faseTorneoId: string): Promise<void> {
  const r = await supabase
    .from('partidos')
    .update({ fase_torneo_id: faseTorneoId })
    .eq('categoria_id', categoriaId)
    .is('fase_torneo_id', null)
  if (r.error) throw toUserError(r.error, 'fixture')
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

export type SorteoBorradorSlot = { fecha: string; canchaId: string; hora: string; horaFin?: string }

/** Propone fecha/cancha/hora por partido sin escribir en la base de datos (borrador para revisar antes de guardar). */
export function generarBorradorSorteo(opts: {
  pendientes: PartidoListaUi[]
  programados: PartidoListaUi[]
  canchas: { id: string }[]
  horarios: { hora: string }[]
  fechaInicio: string
  dias: number
}): Record<string, SorteoBorradorSlot> {
  const out: Record<string, SorteoBorradorSlot> = {}
  const horas = opts.horarios.length ? opts.horarios : HORA_FRANJAS_PREDETERMINADAS
  if (!opts.canchas.length || !horas.length || !opts.pendientes.length) return out

  const ocupadas = opts.programados
    .filter((p) => p.canchaId && p.fecha && p.hora)
    .map((p) => ({ fecha: p.fecha, canchaId: p.canchaId!, hora: p.hora }))

  const shuffled = [...opts.pendientes].sort(() => Math.random() - 0.5)

  for (const p of shuffled) {
    let colocado = false
    for (let d = 0; d < opts.dias && !colocado; d++) {
      const fecha = addDaysToIsoDate(opts.fechaInicio, d)
      const ordenCanchas = [...opts.canchas].sort(() => Math.random() - 0.5)
      const ordenHoras = [...horas].sort(() => Math.random() - 0.5)
      for (const c of ordenCanchas) {
        for (const h of ordenHoras) {
          const horaDb = normalizeHoraDb(String(h.hora))
          const hora = formatHoraUi(horaDb)
          const horaFin = formatHoraUi(addMinutesToTime(horaDb, 90))
          if (hayCruce(ocupadas, fecha, c.id, hora)) continue
          ocupadas.push({ fecha, canchaId: c.id, hora })
          out[p.id] = { fecha, canchaId: c.id, hora, horaFin }
          colocado = true
          break
        }
        if (colocado) break
      }
    }
    if (!colocado) {
      throw new Error(
        'No hay suficientes combinaciones de fecha, cancha y hora sin cruce. Amplía el rango de días o revisa las canchas.',
      )
    }
  }
  return out
}

export async function sorteoProgramacionesTorneoCategoria(
  torneoId: string,
  categoriaId: string,
  opts: { fechaInicio: string; dias: number },
): Promise<{ creadas: number }> {
  const canchas = throwOnError(
    await supabase.from('canchas').select('id').eq('torneo_id', torneoId).eq('activa', true),
  ) as { id: string }[]
  const horariosDb = throwOnError(
    await supabase.from('horarios').select('hora').eq('torneo_id', torneoId).eq('activo', true),
  ) as { hora: string }[]
  const horarios = horariosDb.length ? horariosDb : HORA_FRANJAS_PREDETERMINADAS

  if (!canchas.length) {
    throw new Error('Agrega al menos una cancha activa en Configuración antes de sortear horarios.')
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
            hora_fin: formatHoraUi(addMinutesToTime(normalizeHoraDb(String(h.hora)), 90)),
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
        'No hay suficientes combinaciones de fecha, cancha y hora sin cruce. Amplía el rango de días o revisa las canchas.',
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
