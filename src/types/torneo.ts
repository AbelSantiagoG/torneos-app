import type { CategoriaRow, EquipoRow, TorneoRow } from '@/types/database'

export type FormatoCompetenciaUi = CategoriaRow['formato']

export interface Categoria {
  id: string
  nombre: string
  rangoEdad: string
  color: string
  activa: boolean
  equipos: number
  partidos: number
  valorInscripcion: number
  tarifaArbitraje: number
  edadMin: number | null
  edadMax: number | null
  orden: number
  formato: FormatoCompetenciaUi
}

/** Torneo activo expuesto a la UI (desde fila Supabase). */
export type TorneoActivo = Pick<
  TorneoRow,
  | 'id'
  | 'nombre'
  | 'organizacion'
  | 'logo_url'
  | 'logo_public_id'
  | 'fecha_inicio'
  | 'fecha_fin'
  | 'descripcion'
  | 'estado'
>

export function mapCategoriaRow(
  row: CategoriaRow,
  stats: { equipos: number; partidos: number },
): Categoria {
  return {
    id: row.id,
    nombre: row.nombre,
    rangoEdad: row.rango_edad ?? '',
    color: row.color ?? '#22c55e',
    activa: row.activa,
    equipos: stats.equipos,
    partidos: stats.partidos,
    valorInscripcion: Number(row.valor_inscripcion),
    tarifaArbitraje: Number(row.tarifa_arbitraje),
    edadMin: row.edad_min,
    edadMax: row.edad_max,
    orden: row.orden,
    formato: row.formato ?? 'todos_contra_todos',
  }
}

export interface Equipo {
  id: string
  nombre: string
  categoriaId: string
  color: string
  logoPlaceholder: string
  logoUrl?: string | null
  logoPublicId?: string | null
  jugadores: number
  inscripcionPagada: boolean
  /** Presente cuando el equipo viene de Supabase */
  sigla?: string | null
  estadoInscripcion?: EquipoRow['estado_inscripcion']
  estadoEquipo?: EquipoRow['estado']
  observaciones?: string | null
}

export function mapEquipoRow(row: EquipoRow, jugadoresCount: number): Equipo {
  const sigla = row.sigla?.trim() || row.nombre.slice(0, 2).toUpperCase()
  return {
    id: row.id,
    nombre: row.nombre,
    categoriaId: row.categoria_id,
    color: row.color ?? '#64748b',
    logoPlaceholder: sigla.slice(0, 2).toUpperCase(),
    logoUrl: row.logo_url ?? null,
    logoPublicId: row.logo_public_id ?? null,
    jugadores: jugadoresCount,
    inscripcionPagada: row.estado_inscripcion === 'pagada' || row.estado_inscripcion === 'exonerada',
    sigla: row.sigla,
    estadoInscripcion: row.estado_inscripcion,
    estadoEquipo: row.estado,
    observaciones: row.observaciones,
  }
}

export interface Jugador {
  id: string
  nombre: string
  documento: string
  anioNacimiento: number
  fechaNacimiento?: string | null
  equipoId: string
  categoriaId: string
  estado: 'activo' | 'advertencia' | 'inactivo'
  advertencia?: string
  fotoUrl?: string | null
  fotoPublicId?: string | null
  partidosJugados?: number
}

export interface Partido {
  id: string
  categoriaId: string
  jornada: number
  equipoLocalId: string
  equipoVisitanteId: string
  fecha: string
  hora: string
  cancha: string
  estado: 'pendiente' | 'programado' | 'jugado'
  golesLocal?: number
  golesVisitante?: number
  arbitroId?: string
}

export interface Gol {
  id: string
  partidoId: string
  jugadorId: string
  minuto: number
  equipoId: string
}

export interface Tarjeta {
  id: string
  partidoId: string
  jugadorId: string
  tipo: 'amarilla' | 'roja'
  minuto: number
}

export interface Arbitro {
  id: string
  nombre: string
  escuelaArbitral: string
}

export interface ArbitrajePago {
  id: string
  partidoId: string
  arbitroId: string
  valor: number
  pagado: boolean
  fechaPago?: string
}

export interface Egreso {
  id: string
  fecha: string
  concepto: string
  categoriaGasto: string
  valor: number
  responsable: string
}

export interface Abono {
  id: string
  equipoId: string
  fecha: string
  valor: number
  concepto: string
}

export interface Cancha {
  id: string
  nombre: string
  ubicacion: string
}

export interface HorarioPredeterminado {
  id: string
  dia: string
  horaInicio: string
  horaFin: string
}

export interface ConfiguracionTorneo {
  nombreTorneo: string
  organizacion: string
  logoUrl?: string
  modoOscuro: boolean
}

export interface EstadisticasEquipo {
  equipoId: string
  categoriaId: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
  forma: ('V' | 'E' | 'D')[]
}

export interface Goleador {
  jugadorId: string
  nombre: string
  equipoId: string
  equipoNombre: string
  goles: number
}

export interface PlayoffBracket {
  categoriaId: string
  semifinal1: {
    equipo1Id: string
    equipo2Id: string
    golesEquipo1?: number
    golesEquipo2?: number
    ganadorId?: string
  }
  semifinal2: {
    equipo1Id: string
    equipo2Id: string
    golesEquipo1?: number
    golesEquipo2?: number
    ganadorId?: string
  }
  final: {
    equipo1Id?: string
    equipo2Id?: string
    golesEquipo1?: number
    golesEquipo2?: number
    campeonId?: string
  }
}
