import { supabase } from '@/lib/supabase'
import { pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'

export type ActaListadoRow = {
  partido_id: string
  torneo_id: string
  categoria_id: string
  categoria_nombre: string
  fase_torneo_id: string | null
  fase_nombre: string | null
  jornada: number | null
  fecha: string | null
  hora: string | null
  cancha: string | null
  equipo_local_nombre: string
  equipo_visitante_nombre: string
  estado_partido: string
  acta_id: string | null
  acta_cerrada: boolean | null
  definicion: string | null
  arbitro_nombre: string | null
}

function mapRow(row: Record<string, unknown>): ActaListadoRow {
  return {
    partido_id: pickStr(row, 'partido_id', 'id') || String(row.partido_id ?? ''),
    torneo_id: pickStr(row, 'torneo_id'),
    categoria_id: pickStr(row, 'categoria_id'),
    categoria_nombre: pickStr(row, 'categoria_nombre', 'nombre_categoria'),
    fase_torneo_id: pickStr(row, 'fase_torneo_id', 'fase_id') || null,
    fase_nombre: pickStr(row, 'fase_nombre', 'nombre_fase') || null,
    jornada: row.jornada != null ? Number(row.jornada) : null,
    fecha: pickStr(row, 'fecha', 'fecha_partido', 'fecha_programada') || null,
    hora: pickStr(row, 'hora', 'hora_inicio') || null,
    cancha: pickStr(row, 'cancha', 'cancha_nombre') || null,
    equipo_local_nombre: pickStr(row, 'equipo_local_nombre', 'local_nombre', 'equipo_local'),
    equipo_visitante_nombre: pickStr(row, 'equipo_visitante_nombre', 'visitante_nombre', 'equipo_visitante'),
    estado_partido: pickStr(row, 'estado_partido', 'estado'),
    acta_id: pickStr(row, 'acta_id') || null,
    acta_cerrada: row.cerrada != null ? Boolean(row.cerrada) : row.acta_cerrada != null ? Boolean(row.acta_cerrada) : null,
    definicion: pickStr(row, 'definicion') || null,
    arbitro_nombre: pickStr(row, 'arbitro_nombre') || null,
  }
}

export type ActaEstadoUi = 'sin_acta' | 'edicion' | 'cerrada'

export function estadoActaListado(row: ActaListadoRow): ActaEstadoUi {
  if (!row.acta_id) return 'sin_acta'
  if (row.acta_cerrada === true) return 'cerrada'
  return 'edicion'
}

export async function listActasTorneo(
  torneoId: string,
  filters?: {
    categoriaId?: string
    faseId?: string
    equipoNombre?: string
    estadoActa?: ActaEstadoUi | 'all'
  },
): Promise<ActaListadoRow[]> {
  let q = supabase.from('vw_actas_listado').select('*').eq('torneo_id', torneoId)
  if (filters?.categoriaId) q = q.eq('categoria_id', filters.categoriaId)
  if (filters?.faseId) q = q.eq('fase_torneo_id', filters.faseId)

  const r = await q
  if (r.error) throw toUserError(r.error, 'programacion')

  let rows = ((r.data ?? []) as Record<string, unknown>[]).map(mapRow)

  if (filters?.equipoNombre?.trim()) {
    const term = filters.equipoNombre.trim().toLowerCase()
    rows = rows.filter(
      (x) =>
        x.equipo_local_nombre.toLowerCase().includes(term) ||
        x.equipo_visitante_nombre.toLowerCase().includes(term),
    )
  }

  if (filters?.estadoActa && filters.estadoActa !== 'all') {
    rows = rows.filter((x) => estadoActaListado(x) === filters.estadoActa)
  }

  return rows.sort((a, b) => {
    const fa = a.fecha ?? ''
    const fb = b.fecha ?? ''
    if (fa !== fb) return fa.localeCompare(fb)
    return String(a.hora).localeCompare(String(b.hora))
  })
}
