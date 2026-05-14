/** Tipos alineados con el esquema public en Supabase (campos usados por la app). */

export type EstadoTorneo = 'borrador' | 'activo' | 'finalizado' | 'archivado'
export type EstadoEquipo = 'activo' | 'inactivo' | 'retirado'
export type EstadoInscripcion = 'pendiente' | 'parcial' | 'pagada' | 'exonerada' | 'cancelada'
export type EstadoJugador = 'activo' | 'inactivo' | 'suspendido' | 'pendiente_validacion'
export type EstadoMembresiaJugador = 'activo' | 'transferido' | 'retirado'

export type TorneoRow = {
  id: string
  nombre: string
  organizacion: string
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  logo_url: string | null
  logo_public_id: string | null
  estado: EstadoTorneo
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FormatoCompetencia = 'todos_contra_todos' | 'fase_grupos' | 'eliminatoria'

export type CategoriaRow = {
  id: string
  torneo_id: string
  nombre: string
  rango_edad: string | null
  edad_min: number | null
  edad_max: number | null
  color: string | null
  orden: number
  activa: boolean
  valor_inscripcion: number
  tarifa_arbitraje: number
  formato: FormatoCompetencia
  created_at: string
  updated_at: string
}

export type EquipoRow = {
  id: string
  torneo_id: string
  categoria_id: string
  nombre: string
  sigla: string | null
  color: string | null
  logo_url: string | null
  logo_public_id: string | null
  estado: EstadoEquipo
  estado_inscripcion: EstadoInscripcion
  observaciones: string | null
  created_at: string
  updated_at: string
}

export type JugadorRow = {
  id: string
  torneo_id: string
  nombres: string
  apellidos: string | null
  nombre_completo: string
  tipo_documento: string | null
  documento: string | null
  fecha_nacimiento: string | null
  anio_nacimiento: number | null
  foto_url: string | null
  foto_public_id: string | null
  estado: EstadoJugador
  observaciones: string | null
  created_at: string
  updated_at: string
}

export type JugadorEquipoRow = {
  id: string
  jugador_id: string
  equipo_id: string
  fecha_inicio: string
  fecha_fin: string | null
  estado: EstadoMembresiaJugador
  motivo_cambio: string | null
  created_at: string
}

export type CanchaRow = {
  id: string
  torneo_id: string
  nombre: string
  ubicacion: string | null
  activa: boolean
  created_at: string
  updated_at: string
}

export type HorarioRow = {
  id: string
  torneo_id: string
  hora: string
  activo: boolean
  created_at: string
}

export type MediaAssetTipoDb = 'torneo_logo' | 'equipo_logo' | 'jugador_foto'

export type MediaAssetRow = {
  id: string
  torneo_id: string
  tipo: MediaAssetTipoDb
  secure_url: string
  public_id: string
  created_at?: string
}

/** Definición del resultado en actas_partido (Postgres enum o texto). */
export type DefinicionPartidoDb =
  | 'tiempo_reglamentario'
  | 'tiempo_extra'
  | 'penales'
  | 'walkover'
  | 'suspendido'

export type RolPartidoJugadorDb = 'titular' | 'ingreso_cambio'

export type TipoGolDb = 'normal' | 'penal' | 'autogol' | 'tiro_libre'

export type TipoTarjetaActaDb = 'amarilla' | 'roja' | 'doble_amarilla'

export type TipoFaseTorneoDb =
  | 'todos_contra_todos'
  | 'fase_grupos'
  | 'cuadrangulares'
  | 'eliminatoria_directa'
  | 'final'
  | 'tercer_puesto'
  | 'amistoso'
