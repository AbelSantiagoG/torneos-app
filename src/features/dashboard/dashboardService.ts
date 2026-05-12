import { supabase } from '@/lib/supabase'
import { pickNum, pickStr, throwOnError } from '@/features/_shared/supabaseHelpers'
import {
  isJugadoEstado,
  isProgramadoEstado,
  mapVwPartidoRow,
  type PartidoDashboardUi,
} from '@/features/partidos/partidosUi'
import { findConflictsPorFecha, groupByFecha, listPartidosProgramadosTorneo } from '@/features/partidos/partidosService'

export type { PartidoDashboardUi }

export type DashboardCounts = {
  categoriasTotal: number
  categoriasActivas: number
  equipos: number
  jugadores: number
  partidosTotal: number
  partidosProgramados: number
  partidosJugados: number
}

export type ResumenFinancieroUi = {
  ingresosEsperados: number
  ingresosCobrados: number
  carteraPendiente: number
  totalEgresos: number
  resultado: number
}

export type CategoriaEstadoUi = {
  categoriaId: string
  nombre: string
  color: string
  activa: boolean
  equipos: number
  partidosTotal: number
  partidosJugados: number
}

export type DashboardConflictsInfo = {
  hasConflicts: boolean
  detalle: string | null
  ids: string[]
}

export async function getDashboardConflicts(torneoId: string): Promise<DashboardConflictsInfo> {
  const partidos = await listPartidosProgramadosTorneo(torneoId)
  const byFecha = groupByFecha(partidos)
  const ids = findConflictsPorFecha(byFecha)
  if (!ids.length) return { hasConflicts: false, detalle: null, ids: [] }

  for (const fecha of Object.keys(byFecha)) {
    const list = byFecha[fecha] ?? []
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]!
        const b = list[j]!
        if (a.hora && b.hora && a.hora === b.hora && a.cancha && b.cancha && a.cancha === b.cancha) {
          return {
            hasConflicts: true,
            detalle: `Hay partidos el ${fecha} a las ${a.hora} en ${a.cancha}.`,
            ids,
          }
        }
      }
    }
  }

  return { hasConflicts: true, detalle: 'Hay solapamiento de horario y cancha en el fixture.', ids }
}

export async function getDashboardCounts(torneoId: string): Promise<DashboardCounts> {
  const catQ = supabase.from('categorias').select('id, activa', { count: 'exact' }).eq('torneo_id', torneoId)
  const eqQ = supabase.from('equipos').select('id', { count: 'exact', head: true }).eq('torneo_id', torneoId)
  const jugQ = supabase.from('jugadores').select('id', { count: 'exact', head: true }).eq('torneo_id', torneoId)
  const parQ = supabase.from('partidos').select('id, estado', { count: 'exact' }).eq('torneo_id', torneoId)

  const [catRes, eqRes, jugRes, parRes] = await Promise.all([catQ, eqQ, jugQ, parQ])

  if (catRes.error) throw new Error(catRes.error.message)
  if (eqRes.error) throw new Error(eqRes.error.message)
  if (jugRes.error) throw new Error(jugRes.error.message)
  if (parRes.error) throw new Error(parRes.error.message)

  const categorias = (catRes.data ?? []) as { id: string; activa: boolean }[]
  const partidos = (parRes.data ?? []) as { estado: string }[]

  let programados = 0
  let jugados = 0
  for (const p of partidos) {
    const st = String(p.estado ?? '')
    if (isJugadoEstado(st)) jugados++
    else if (isProgramadoEstado(st)) programados++
  }

  return {
    categoriasTotal: categorias.length,
    categoriasActivas: categorias.filter((c) => c.activa).length,
    equipos: eqRes.count ?? 0,
    jugadores: jugRes.count ?? 0,
    partidosTotal: parRes.count ?? partidos.length,
    partidosProgramados: programados,
    partidosJugados: jugados,
  }
}

export async function getResumenFinancieroFromView(torneoId: string): Promise<ResumenFinancieroUi> {
  const r = await supabase.from('vw_resumen_financiero').select('*').eq('torneo_id', torneoId).maybeSingle()
  if (!r.error && r.data) {
    const row = r.data as Record<string, unknown>
    return {
      ingresosEsperados: pickNum(
        row,
        'ingresos_esperados',
        'ingreso_esperado',
        'total_esperado',
        'monto_esperado_total',
        'ingresos_esperado',
      ),
      ingresosCobrados: pickNum(
        row,
        'ingresos_cobrados',
        'total_cobrado',
        'cobrado',
        'total_ingresos_cobrados',
        'monto_cobrado',
      ),
      carteraPendiente: pickNum(row, 'cartera_pendiente', 'pendiente', 'saldo_pendiente', 'cartera'),
      totalEgresos: pickNum(row, 'total_egresos', 'egresos', 'total_egreso'),
      resultado: pickNum(row, 'resultado', 'resultado_neto', 'balance', 'utilidad'),
    }
  }

  const rAll = await supabase.from('vw_resumen_financiero').select('*').limit(1).maybeSingle()
  if (!rAll.error && rAll.data) {
    const row = rAll.data as Record<string, unknown>
    const tid = pickStr(row, 'torneo_id')
    if (!tid || tid === torneoId) {
      return {
        ingresosEsperados: pickNum(row, 'ingresos_esperados', 'total_esperado'),
        ingresosCobrados: pickNum(row, 'ingresos_cobrados', 'total_cobrado'),
        carteraPendiente: pickNum(row, 'cartera_pendiente', 'pendiente'),
        totalEgresos: pickNum(row, 'total_egresos', 'egresos'),
        resultado: pickNum(row, 'resultado', 'balance'),
      }
    }
  }

  return {
    ingresosEsperados: 0,
    ingresosCobrados: 0,
    carteraPendiente: 0,
    totalEgresos: 0,
    resultado: 0,
  }
}

export async function getCategoriaEstadosDashboard(torneoId: string): Promise<CategoriaEstadoUi[]> {
  const cats = throwOnError(
    await supabase.from('categorias').select('id, nombre, color, activa').eq('torneo_id', torneoId).order('orden'),
  ) as { id: string; nombre: string; color: string | null; activa: boolean }[]

  const eqRows = throwOnError(
    await supabase.from('equipos').select('id, categoria_id').eq('torneo_id', torneoId),
  ) as { categoria_id: string }[]

  const parRows = throwOnError(
    await supabase.from('partidos').select('categoria_id, estado').eq('torneo_id', torneoId),
  ) as { categoria_id: string; estado: string }[]

  const eqByCat = new Map<string, number>()
  for (const e of eqRows) {
    eqByCat.set(e.categoria_id, (eqByCat.get(e.categoria_id) ?? 0) + 1)
  }

  const partByCat = new Map<string, { total: number; jugados: number }>()
  for (const p of parRows) {
    const cur = partByCat.get(p.categoria_id) ?? { total: 0, jugados: 0 }
    cur.total++
    if (isJugadoEstado(String(p.estado ?? ''))) cur.jugados++
    partByCat.set(p.categoria_id, cur)
  }

  return cats.map((c) => {
    const p = partByCat.get(c.id) ?? { total: 0, jugados: 0 }
    return {
      categoriaId: c.id,
      nombre: c.nombre,
      color: c.color ?? '#22c55e',
      activa: c.activa,
      equipos: eqByCat.get(c.id) ?? 0,
      partidosTotal: p.total,
      partidosJugados: p.jugados,
    }
  })
}

export async function getProximosPartidos(torneoId: string, limit: number): Promise<PartidoDashboardUi[]> {
  const rows = await fetchPartidosDetalleRows(torneoId)
  const upcoming = rows
    .filter((r) => !isJugadoEstado(String(r.estado ?? '')))
    .slice(0, limit)
  return upcoming
}

export async function getUltimosResultados(torneoId: string, limit: number): Promise<PartidoDashboardUi[]> {
  const rows = await fetchPartidosDetalleRows(torneoId)
  const done = rows.filter((r) => isJugadoEstado(String(r.estado ?? '')))
  return done.slice(-limit).reverse()
}

async function fetchPartidosDetalleRows(torneoId: string): Promise<PartidoDashboardUi[]> {
  const v = await supabase.from('vw_partidos_detalle').select('*').eq('torneo_id', torneoId)
  if (!v.error && v.data && v.data.length > 0) {
    return (v.data as Record<string, unknown>[]).map(mapVwPartidoRow)
  }

  const v2 = await supabase.from('vw_partidos_detalle').select('*')
  if (!v2.error && v2.data) {
    const filtered = (v2.data as Record<string, unknown>[]).filter((row) => pickStr(row, 'torneo_id') === torneoId)
    if (filtered.length) return filtered.map(mapVwPartidoRow)
  }

  const p = await supabase
    .from('partidos')
    .select('id, torneo_id, categoria_id, jornada, fecha_fixture, estado, equipo_local_id, equipo_visitante_id')
    .eq('torneo_id', torneoId)
    .order('jornada', { ascending: true })

  if (p.error || !p.data?.length) return []

  const partidos = p.data as {
    id: string
    categoria_id: string
    fecha_fixture: string | null
    estado: string
    equipo_local_id: string | null
    equipo_visitante_id: string | null
  }[]

  const catIds = [...new Set(partidos.map((x) => x.categoria_id))]
  const teamIds = new Set<string>()
  for (const x of partidos) {
    if (x.equipo_local_id) teamIds.add(x.equipo_local_id)
    if (x.equipo_visitante_id) teamIds.add(x.equipo_visitante_id)
  }

  const [cats, teams] = await Promise.all([
    catIds.length
      ? supabase.from('categorias').select('id, nombre, color').in('id', catIds)
      : Promise.resolve({ data: [], error: null } as const),
    teamIds.size
      ? supabase.from('equipos').select('id, nombre').in('id', [...teamIds])
      : Promise.resolve({ data: [], error: null } as const),
  ])

  const catMap = new Map((cats.data as { id: string; nombre: string; color: string | null }[] | null)?.map((c) => [c.id, c]) ?? [])
  const teamMap = new Map((teams.data as { id: string; nombre: string }[] | null)?.map((t) => [t.id, t.nombre]) ?? [])

  return partidos.map((x) => {
    const cat = catMap.get(x.categoria_id)
    return {
      id: x.id,
      fecha: x.fecha_fixture ?? '',
      hora: '',
      cancha: '',
      estado: x.estado,
      categoriaId: x.categoria_id,
      categoriaNombre: cat?.nombre ?? '',
      categoriaColor: cat?.color ?? '#64748b',
      equipoLocalNombre: x.equipo_local_id ? (teamMap.get(x.equipo_local_id) ?? '—') : '—',
      equipoVisitanteNombre: x.equipo_visitante_id ? (teamMap.get(x.equipo_visitante_id) ?? '—') : '—',
      golesLocal: null,
      golesVisitante: null,
      equipoLocalId: x.equipo_local_id,
      equipoVisitanteId: x.equipo_visitante_id,
    }
  })
}
