export interface Categoria {
  id: string
  nombre: string
  rangoEdad: string
  color: string
  activa: boolean
  equipos: number
  partidos: number
  valorInscripcion: number
}

export interface Equipo {
  id: string
  nombre: string
  categoriaId: string
  color: string
  logoPlaceholder: string
  jugadores: number
  inscripcionPagada: boolean
}

export interface Jugador {
  id: string
  nombre: string
  documento: string
  anioNacimiento: number
  equipoId: string
  categoriaId: string
  estado: 'activo' | 'advertencia' | 'inactivo'
  advertencia?: string
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
