import { pickStr } from '@/features/_shared/supabaseHelpers'

export type PartidoDashboardUi = {
  id: string
  fecha: string
  hora: string
  horaFin?: string
  cancha: string
  canchaId?: string | null
  estado: string
  categoriaId: string
  categoriaNombre: string
  categoriaColor: string
  equipoLocalNombre: string
  equipoVisitanteNombre: string
  equipoLocalLogoUrl?: string | null
  equipoVisitanteLogoUrl?: string | null
  equipoLocalLogoPublicId?: string | null
  equipoVisitanteLogoPublicId?: string | null
  golesLocal: number | null
  golesVisitante: number | null
  equipoLocalId?: string | null
  equipoVisitanteId?: string | null
  programacionId?: string | null
  /** Orden dentro de la jornada (fixture). */
  orden?: number
}

export function mapVwPartidoRow(row: Record<string, unknown>): PartidoDashboardUi {
  const gl =
    row.goles_local != null && row.goles_local !== ''
      ? Number(row.goles_local)
      : row.goles_local_final != null
        ? Number(row.goles_local_final)
        : null
  const gv =
    row.goles_visitante != null && row.goles_visitante !== ''
      ? Number(row.goles_visitante)
      : row.goles_visitante_final != null
        ? Number(row.goles_visitante_final)
        : null
  return {
    id: pickStr(row, 'partido_id', 'id') || String(row.id ?? ''),
    fecha: pickStr(row, 'fecha', 'fecha_partido', 'fecha_fixture', 'fecha_programada'),
    hora: pickStr(row, 'hora', 'hora_partido', 'hora_inicio'),
    cancha: pickStr(row, 'cancha', 'cancha_nombre', 'nombre_cancha'),
    estado: pickStr(row, 'estado', 'estado_partido'),
    categoriaId: pickStr(row, 'categoria_id'),
    categoriaNombre: pickStr(row, 'categoria_nombre', 'nombre_categoria'),
    categoriaColor: pickStr(row, 'categoria_color', 'color_categoria') || '#64748b',
    equipoLocalNombre: pickStr(row, 'equipo_local', 'local_nombre', 'nombre_local', 'equipo_local_nombre'),
    equipoVisitanteNombre: pickStr(row, 'equipo_visitante', 'visitante_nombre', 'nombre_visitante', 'equipo_visitante_nombre'),
    golesLocal: gl != null && !Number.isNaN(gl) ? gl : null,
    golesVisitante: gv != null && !Number.isNaN(gv) ? gv : null,
    equipoLocalId: pickStr(row, 'equipo_local_id', 'local_id') || null,
    equipoVisitanteId: pickStr(row, 'equipo_visitante_id', 'visitante_id') || null,
  }
}

export function isJugadoEstado(estado: string): boolean {
  const e = estado.toLowerCase()
  return e.includes('jugad') || e === 'finalizado' || e === 'finalizada' || e === 'cerrado'
}

export function isProgramadoEstado(estado: string): boolean {
  const e = estado.toLowerCase()
  if (isJugadoEstado(estado)) return false
  if (e === 'pendiente_programar' || e.includes('pendiente de program')) return false
  return (
    e === 'programado' ||
    e.includes('agend') ||
    e === 'por_jugar'
  )
}
