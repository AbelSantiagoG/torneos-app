import { supabase } from '@/lib/supabase'
import { throwOnError } from '@/features/_shared/supabaseHelpers'
import { isJugadoEstado, mapVwPartidoRow, type PartidoDashboardUi } from '@/features/partidos/partidosUi'

export type PartidoListaUi = PartidoDashboardUi & { jornada: number }

async function listVwOrPartidos(torneoId: string, categoriaId?: string): Promise<PartidoListaUi[]> {
  let v = await supabase.from('vw_partidos_detalle').select('*').eq('torneo_id', torneoId)
  if (categoriaId) {
    v = await supabase.from('vw_partidos_detalle').select('*').eq('torneo_id', torneoId).eq('categoria_id', categoriaId)
  }

  if (!v.error && v.data?.length) {
    return (v.data as Record<string, unknown>[]).map((row) => {
      const base = mapVwPartidoRow(row)
      return { ...base, jornada: Number(row.jornada ?? row.numero_jornada ?? 0) || 0 }
    })
  }

  const p = await supabase
    .from('partidos')
    .select(
      'id, torneo_id, categoria_id, jornada, fecha_fixture, estado, equipo_local_id, equipo_visitante_id',
    )
    .eq('torneo_id', torneoId)
    .order('jornada', { ascending: true })

  let rows = throwOnError(p) as {
    id: string
    categoria_id: string
    jornada: number
    fecha_fixture: string | null
    estado: string
    equipo_local_id: string | null
    equipo_visitante_id: string | null
  }[]

  if (categoriaId) rows = rows.filter((r) => r.categoria_id === categoriaId)
  if (!rows.length) return []

  const catIds = [...new Set(rows.map((x) => x.categoria_id))]
  const teamIds = new Set<string>()
  for (const x of rows) {
    if (x.equipo_local_id) teamIds.add(x.equipo_local_id)
    if (x.equipo_visitante_id) teamIds.add(x.equipo_visitante_id)
  }

  const [cats, teams] = await Promise.all([
    supabase.from('categorias').select('id, nombre, color').in('id', catIds),
    supabase.from('equipos').select('id, nombre').in('id', [...teamIds]),
  ])

  const catMap = new Map(
    (throwOnError(cats) as { id: string; nombre: string; color: string | null }[]).map((c) => [c.id, c]),
  )
  const teamMap = new Map((throwOnError(teams) as { id: string; nombre: string }[]).map((t) => [t.id, t.nombre]))

  return rows.map((x) => {
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
      jornada: x.jornada ?? 0,
    }
  })
}

export async function listPartidosTorneoCategoria(torneoId: string, categoriaId: string): Promise<PartidoListaUi[]> {
  return listVwOrPartidos(torneoId, categoriaId)
}

export async function listPartidosTorneo(torneoId: string): Promise<PartidoListaUi[]> {
  return listVwOrPartidos(torneoId)
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

export function findConflictsPorFecha(partidosPorFecha: Record<string, PartidoListaUi[]>): string[] {
  const conflictIds: string[] = []
  for (const fecha of Object.keys(partidosPorFecha)) {
    const list = partidosPorFecha[fecha] ?? []
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p1 = list[i]!
        const p2 = list[j]!
        if (p1.hora && p2.hora && p1.hora === p2.hora && p1.cancha && p2.cancha && p1.cancha === p2.cancha) {
          conflictIds.push(p1.id, p2.id)
        }
      }
    }
  }
  return [...new Set(conflictIds)]
}
