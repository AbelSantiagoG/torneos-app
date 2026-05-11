import type {
  Categoria,
  Equipo,
  Jugador,
  Partido,
  Arbitro,
  ArbitrajePago,
  Egreso,
  Abono,
  Cancha,
  EstadisticasEquipo,
  Goleador,
  PlayoffBracket,
} from '../types/torneo'

export const categorias: Categoria[] = [
  { id: 'cat-1', nombre: 'Sub-5', rangoEdad: '4-5 años', color: '#22c55e', activa: true, equipos: 8, partidos: 28, valorInscripcion: 150000, tarifaArbitraje: 30000, edadMin: null, edadMax: null, orden: 0 },
  { id: 'cat-2', nombre: 'Sub-7', rangoEdad: '6-7 años', color: '#3b82f6', activa: true, equipos: 10, partidos: 45, valorInscripcion: 180000, tarifaArbitraje: 30000, edadMin: null, edadMax: null, orden: 1 },
  { id: 'cat-3', nombre: 'Sub-9', rangoEdad: '8-9 años', color: '#f59e0b', activa: true, equipos: 12, partidos: 66, valorInscripcion: 200000, tarifaArbitraje: 35000, edadMin: null, edadMax: null, orden: 2 },
  { id: 'cat-4', nombre: 'Sub-11', rangoEdad: '10-11 años', color: '#ef4444', activa: true, equipos: 10, partidos: 45, valorInscripcion: 220000, tarifaArbitraje: 35000, edadMin: null, edadMax: null, orden: 3 },
  { id: 'cat-5', nombre: 'Sub-13', rangoEdad: '12-13 años', color: '#8b5cf6', activa: true, equipos: 8, partidos: 28, valorInscripcion: 250000, tarifaArbitraje: 40000, edadMin: null, edadMax: null, orden: 4 },
  { id: 'cat-6', nombre: 'Sub-15', rangoEdad: '14-15 años', color: '#06b6d4', activa: true, equipos: 6, partidos: 15, valorInscripcion: 280000, tarifaArbitraje: 40000, edadMin: null, edadMax: null, orden: 5 },
  { id: 'cat-7', nombre: 'Sub-17', rangoEdad: '16-17 años', color: '#ec4899', activa: false, equipos: 4, partidos: 6, valorInscripcion: 300000, tarifaArbitraje: 40000, edadMin: null, edadMax: null, orden: 6 },
]

export const equipos: Equipo[] = [
  // Sub-7
  { id: 'eq-1', nombre: 'Deportivo Águilas', categoriaId: 'cat-2', color: '#dc2626', logoPlaceholder: 'DA', jugadores: 12, inscripcionPagada: true },
  { id: 'eq-2', nombre: 'FC Tigres', categoriaId: 'cat-2', color: '#f97316', logoPlaceholder: 'TI', jugadores: 11, inscripcionPagada: true },
  { id: 'eq-3', nombre: 'Real Santander', categoriaId: 'cat-2', color: '#eab308', logoPlaceholder: 'RS', jugadores: 10, inscripcionPagada: false },
  { id: 'eq-4', nombre: 'Club Leones', categoriaId: 'cat-2', color: '#22c55e', logoPlaceholder: 'CL', jugadores: 12, inscripcionPagada: true },
  { id: 'eq-5', nombre: 'Atlético Junior', categoriaId: 'cat-2', color: '#14b8a6', logoPlaceholder: 'AJ', jugadores: 11, inscripcionPagada: true },
  { id: 'eq-6', nombre: 'Independiente', categoriaId: 'cat-2', color: '#3b82f6', logoPlaceholder: 'IN', jugadores: 10, inscripcionPagada: false },
  { id: 'eq-7', nombre: 'Racing Club', categoriaId: 'cat-2', color: '#6366f1', logoPlaceholder: 'RC', jugadores: 12, inscripcionPagada: true },
  { id: 'eq-8', nombre: 'Boca Juniors', categoriaId: 'cat-2', color: '#8b5cf6', logoPlaceholder: 'BJ', jugadores: 11, inscripcionPagada: true },
  { id: 'eq-9', nombre: 'River Plate', categoriaId: 'cat-2', color: '#ec4899', logoPlaceholder: 'RP', jugadores: 10, inscripcionPagada: true },
  { id: 'eq-10', nombre: 'San Lorenzo', categoriaId: 'cat-2', color: '#f43f5e', logoPlaceholder: 'SL', jugadores: 12, inscripcionPagada: false },
  // Sub-9
  { id: 'eq-11', nombre: 'Millonarios FC', categoriaId: 'cat-3', color: '#1d4ed8', logoPlaceholder: 'MF', jugadores: 14, inscripcionPagada: true },
  { id: 'eq-12', nombre: 'Santa Fe', categoriaId: 'cat-3', color: '#dc2626', logoPlaceholder: 'SF', jugadores: 13, inscripcionPagada: true },
  { id: 'eq-13', nombre: 'América de Cali', categoriaId: 'cat-3', color: '#b91c1c', logoPlaceholder: 'AC', jugadores: 14, inscripcionPagada: true },
  { id: 'eq-14', nombre: 'Deportivo Cali', categoriaId: 'cat-3', color: '#16a34a', logoPlaceholder: 'DC', jugadores: 12, inscripcionPagada: false },
  { id: 'eq-15', nombre: 'Nacional', categoriaId: 'cat-3', color: '#15803d', logoPlaceholder: 'NA', jugadores: 14, inscripcionPagada: true },
  { id: 'eq-16', nombre: 'Medellín', categoriaId: 'cat-3', color: '#991b1b', logoPlaceholder: 'ME', jugadores: 13, inscripcionPagada: true },
]

export const jugadores: Jugador[] = [
  // Deportivo Águilas
  { id: 'jug-1', nombre: 'Santiago García', documento: '1098765432', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-2', nombre: 'Mateo López', documento: '1098765433', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-3', nombre: 'Daniel Martínez', documento: '1098765434', anioNacimiento: 2019, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'advertencia', advertencia: 'Documento por vencer' },
  { id: 'jug-4', nombre: 'Sebastián Rodríguez', documento: '1098765435', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-5', nombre: 'Nicolás Hernández', documento: '1098765436', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-6', nombre: 'Alejandro Torres', documento: '1098765437', anioNacimiento: 2019, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-7', nombre: 'Andrés Ramírez', documento: '1098765438', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-8', nombre: 'Juan Pablo Díaz', documento: '1098765439', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-9', nombre: 'Carlos Moreno', documento: '1098765440', anioNacimiento: 2019, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-10', nombre: 'David Vargas', documento: '1098765441', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'advertencia', advertencia: 'Acta de nacimiento pendiente' },
  { id: 'jug-11', nombre: 'Felipe Castro', documento: '1098765442', anioNacimiento: 2018, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-12', nombre: 'Luis Gómez', documento: '1098765443', anioNacimiento: 2019, equipoId: 'eq-1', categoriaId: 'cat-2', estado: 'activo' },
  // FC Tigres
  { id: 'jug-13', nombre: 'Tomás Pérez', documento: '1098765444', anioNacimiento: 2018, equipoId: 'eq-2', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-14', nombre: 'Emilio Sánchez', documento: '1098765445', anioNacimiento: 2018, equipoId: 'eq-2', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-15', nombre: 'Gabriel Ruiz', documento: '1098765446', anioNacimiento: 2019, equipoId: 'eq-2', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-16', nombre: 'Pablo Jiménez', documento: '1098765447', anioNacimiento: 2018, equipoId: 'eq-2', categoriaId: 'cat-2', estado: 'activo' },
  { id: 'jug-17', nombre: 'Samuel Ortiz', documento: '1098765448', anioNacimiento: 2018, equipoId: 'eq-2', categoriaId: 'cat-2', estado: 'activo' },
]

export const partidos: Partido[] = [
  // Jornada 1 - Sub-7
  { id: 'par-1', categoriaId: 'cat-2', jornada: 1, equipoLocalId: 'eq-1', equipoVisitanteId: 'eq-2', fecha: '2024-03-15', hora: '08:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 3, golesVisitante: 1, arbitroId: 'arb-1' },
  { id: 'par-2', categoriaId: 'cat-2', jornada: 1, equipoLocalId: 'eq-3', equipoVisitanteId: 'eq-4', fecha: '2024-03-15', hora: '09:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 2, golesVisitante: 2, arbitroId: 'arb-2' },
  { id: 'par-3', categoriaId: 'cat-2', jornada: 1, equipoLocalId: 'eq-5', equipoVisitanteId: 'eq-6', fecha: '2024-03-15', hora: '10:00', cancha: 'Cancha 2', estado: 'jugado', golesLocal: 4, golesVisitante: 0, arbitroId: 'arb-1' },
  { id: 'par-4', categoriaId: 'cat-2', jornada: 1, equipoLocalId: 'eq-7', equipoVisitanteId: 'eq-8', fecha: '2024-03-15', hora: '11:00', cancha: 'Cancha 2', estado: 'jugado', golesLocal: 1, golesVisitante: 2, arbitroId: 'arb-3' },
  { id: 'par-5', categoriaId: 'cat-2', jornada: 1, equipoLocalId: 'eq-9', equipoVisitanteId: 'eq-10', fecha: '2024-03-15', hora: '12:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 3, golesVisitante: 3, arbitroId: 'arb-2' },
  // Jornada 2 - Sub-7
  { id: 'par-6', categoriaId: 'cat-2', jornada: 2, equipoLocalId: 'eq-2', equipoVisitanteId: 'eq-3', fecha: '2024-03-22', hora: '08:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 2, golesVisitante: 1, arbitroId: 'arb-1' },
  { id: 'par-7', categoriaId: 'cat-2', jornada: 2, equipoLocalId: 'eq-4', equipoVisitanteId: 'eq-5', fecha: '2024-03-22', hora: '09:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 0, golesVisitante: 3, arbitroId: 'arb-2' },
  { id: 'par-8', categoriaId: 'cat-2', jornada: 2, equipoLocalId: 'eq-6', equipoVisitanteId: 'eq-7', fecha: '2024-03-22', hora: '10:00', cancha: 'Cancha 2', estado: 'jugado', golesLocal: 1, golesVisitante: 1, arbitroId: 'arb-3' },
  { id: 'par-9', categoriaId: 'cat-2', jornada: 2, equipoLocalId: 'eq-8', equipoVisitanteId: 'eq-9', fecha: '2024-03-22', hora: '11:00', cancha: 'Cancha 2', estado: 'jugado', golesLocal: 2, golesVisitante: 0, arbitroId: 'arb-1' },
  { id: 'par-10', categoriaId: 'cat-2', jornada: 2, equipoLocalId: 'eq-10', equipoVisitanteId: 'eq-1', fecha: '2024-03-22', hora: '12:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 1, golesVisitante: 4, arbitroId: 'arb-2' },
  // Jornada 3 - Sub-7 (próximos partidos)
  { id: 'par-11', categoriaId: 'cat-2', jornada: 3, equipoLocalId: 'eq-1', equipoVisitanteId: 'eq-3', fecha: '2024-03-29', hora: '08:00', cancha: 'Cancha 1', estado: 'programado' },
  { id: 'par-12', categoriaId: 'cat-2', jornada: 3, equipoLocalId: 'eq-2', equipoVisitanteId: 'eq-4', fecha: '2024-03-29', hora: '09:00', cancha: 'Cancha 1', estado: 'programado' },
  { id: 'par-13', categoriaId: 'cat-2', jornada: 3, equipoLocalId: 'eq-5', equipoVisitanteId: 'eq-7', fecha: '2024-03-29', hora: '10:00', cancha: 'Cancha 2', estado: 'programado' },
  { id: 'par-14', categoriaId: 'cat-2', jornada: 3, equipoLocalId: 'eq-6', equipoVisitanteId: 'eq-8', fecha: '2024-03-29', hora: '11:00', cancha: 'Cancha 2', estado: 'programado' },
  { id: 'par-15', categoriaId: 'cat-2', jornada: 3, equipoLocalId: 'eq-9', equipoVisitanteId: 'eq-10', fecha: '2024-03-29', hora: '10:00', cancha: 'Cancha 1', estado: 'pendiente' },
  // Sub-9
  { id: 'par-16', categoriaId: 'cat-3', jornada: 1, equipoLocalId: 'eq-11', equipoVisitanteId: 'eq-12', fecha: '2024-03-16', hora: '08:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 2, golesVisitante: 1, arbitroId: 'arb-1' },
  { id: 'par-17', categoriaId: 'cat-3', jornada: 1, equipoLocalId: 'eq-13', equipoVisitanteId: 'eq-14', fecha: '2024-03-16', hora: '09:00', cancha: 'Cancha 2', estado: 'jugado', golesLocal: 3, golesVisitante: 2, arbitroId: 'arb-2' },
  { id: 'par-18', categoriaId: 'cat-3', jornada: 1, equipoLocalId: 'eq-15', equipoVisitanteId: 'eq-16', fecha: '2024-03-16', hora: '10:00', cancha: 'Cancha 1', estado: 'jugado', golesLocal: 1, golesVisitante: 0, arbitroId: 'arb-3' },
]

export const arbitros: Arbitro[] = [
  { id: 'arb-1', nombre: 'Carlos Mendoza', escuelaArbitral: 'Escuela Nacional de Arbitraje' },
  { id: 'arb-2', nombre: 'María Fernández', escuelaArbitral: 'Academia de Árbitros del Valle' },
  { id: 'arb-3', nombre: 'Jorge Ramírez', escuelaArbitral: 'Escuela Nacional de Arbitraje' },
  { id: 'arb-4', nombre: 'Ana Martínez', escuelaArbitral: 'Colegio de Árbitros Profesionales' },
]

export const arbitrajePagos: ArbitrajePago[] = [
  { id: 'ap-1', partidoId: 'par-1', arbitroId: 'arb-1', valor: 50000, pagado: true, fechaPago: '2024-03-15' },
  { id: 'ap-2', partidoId: 'par-2', arbitroId: 'arb-2', valor: 50000, pagado: true, fechaPago: '2024-03-15' },
  { id: 'ap-3', partidoId: 'par-3', arbitroId: 'arb-1', valor: 50000, pagado: true, fechaPago: '2024-03-15' },
  { id: 'ap-4', partidoId: 'par-4', arbitroId: 'arb-3', valor: 50000, pagado: false },
  { id: 'ap-5', partidoId: 'par-5', arbitroId: 'arb-2', valor: 50000, pagado: false },
  { id: 'ap-6', partidoId: 'par-6', arbitroId: 'arb-1', valor: 50000, pagado: true, fechaPago: '2024-03-22' },
  { id: 'ap-7', partidoId: 'par-7', arbitroId: 'arb-2', valor: 50000, pagado: false },
  { id: 'ap-8', partidoId: 'par-8', arbitroId: 'arb-3', valor: 50000, pagado: false },
  { id: 'ap-9', partidoId: 'par-16', arbitroId: 'arb-1', valor: 60000, pagado: true, fechaPago: '2024-03-16' },
  { id: 'ap-10', partidoId: 'par-17', arbitroId: 'arb-2', valor: 60000, pagado: false },
  { id: 'ap-11', partidoId: 'par-18', arbitroId: 'arb-3', valor: 60000, pagado: false },
]

export const egresos: Egreso[] = [
  { id: 'eg-1', fecha: '2024-03-01', concepto: 'Alquiler de canchas marzo', categoriaGasto: 'Infraestructura', valor: 800000, responsable: 'Admin Principal' },
  { id: 'eg-2', fecha: '2024-03-05', concepto: 'Balones oficiales', categoriaGasto: 'Material deportivo', valor: 350000, responsable: 'Coordinador deportivo' },
  { id: 'eg-3', fecha: '2024-03-10', concepto: 'Trofeos y medallas', categoriaGasto: 'Premiación', valor: 500000, responsable: 'Admin Principal' },
  { id: 'eg-4', fecha: '2024-03-12', concepto: 'Impresión de carnets', categoriaGasto: 'Administrativo', valor: 150000, responsable: 'Secretaría' },
  { id: 'eg-5', fecha: '2024-03-15', concepto: 'Refrigerios inauguración', categoriaGasto: 'Eventos', valor: 200000, responsable: 'Logística' },
  { id: 'eg-6', fecha: '2024-03-18', concepto: 'Pago arbitraje semana 1', categoriaGasto: 'Arbitraje', valor: 250000, responsable: 'Tesorería' },
]

export const abonos: Abono[] = [
  { id: 'ab-1', equipoId: 'eq-1', fecha: '2024-02-20', valor: 180000, concepto: 'Pago total inscripción' },
  { id: 'ab-2', equipoId: 'eq-2', fecha: '2024-02-22', valor: 180000, concepto: 'Pago total inscripción' },
  { id: 'ab-3', equipoId: 'eq-3', fecha: '2024-02-25', valor: 90000, concepto: 'Abono parcial 50%' },
  { id: 'ab-4', equipoId: 'eq-4', fecha: '2024-02-28', valor: 180000, concepto: 'Pago total inscripción' },
  { id: 'ab-5', equipoId: 'eq-5', fecha: '2024-03-01', valor: 180000, concepto: 'Pago total inscripción' },
  { id: 'ab-6', equipoId: 'eq-11', fecha: '2024-02-20', valor: 200000, concepto: 'Pago total inscripción' },
  { id: 'ab-7', equipoId: 'eq-12', fecha: '2024-02-21', valor: 200000, concepto: 'Pago total inscripción' },
  { id: 'ab-8', equipoId: 'eq-13', fecha: '2024-02-22', valor: 200000, concepto: 'Pago total inscripción' },
  { id: 'ab-9', equipoId: 'eq-14', fecha: '2024-02-23', valor: 100000, concepto: 'Abono parcial 50%' },
  { id: 'ab-10', equipoId: 'eq-15', fecha: '2024-02-24', valor: 200000, concepto: 'Pago total inscripción' },
]

export const canchas: Cancha[] = [
  { id: 'can-1', nombre: 'Cancha 1', ubicacion: 'Sector Norte - Principal' },
  { id: 'can-2', nombre: 'Cancha 2', ubicacion: 'Sector Norte - Auxiliar' },
  { id: 'can-3', nombre: 'Cancha 3', ubicacion: 'Sector Sur - Principal' },
]

export const estadisticasEquipos: EstadisticasEquipo[] = [
  { equipoId: 'eq-1', categoriaId: 'cat-2', pj: 2, pg: 2, pe: 0, pp: 0, gf: 7, gc: 2, dg: 5, pts: 6, forma: ['V', 'V'] },
  { equipoId: 'eq-5', categoriaId: 'cat-2', pj: 2, pg: 2, pe: 0, pp: 0, gf: 7, gc: 0, dg: 7, pts: 6, forma: ['V', 'V'] },
  { equipoId: 'eq-8', categoriaId: 'cat-2', pj: 2, pg: 2, pe: 0, pp: 0, gf: 4, gc: 1, dg: 3, pts: 6, forma: ['V', 'V'] },
  { equipoId: 'eq-2', categoriaId: 'cat-2', pj: 2, pg: 1, pe: 0, pp: 1, gf: 3, gc: 4, dg: -1, pts: 3, forma: ['D', 'V'] },
  { equipoId: 'eq-3', categoriaId: 'cat-2', pj: 2, pg: 0, pe: 1, pp: 1, gf: 3, gc: 4, dg: -1, pts: 1, forma: ['E', 'D'] },
  { equipoId: 'eq-4', categoriaId: 'cat-2', pj: 2, pg: 0, pe: 1, pp: 1, gf: 2, gc: 5, dg: -3, pts: 1, forma: ['E', 'D'] },
  { equipoId: 'eq-6', categoriaId: 'cat-2', pj: 2, pg: 0, pe: 1, pp: 1, gf: 1, gc: 5, dg: -4, pts: 1, forma: ['D', 'E'] },
  { equipoId: 'eq-7', categoriaId: 'cat-2', pj: 2, pg: 0, pe: 1, pp: 1, gf: 2, gc: 3, dg: -1, pts: 1, forma: ['D', 'E'] },
  { equipoId: 'eq-9', categoriaId: 'cat-2', pj: 2, pg: 0, pe: 1, pp: 1, gf: 3, gc: 5, dg: -2, pts: 1, forma: ['E', 'D'] },
  { equipoId: 'eq-10', categoriaId: 'cat-2', pj: 2, pg: 0, pe: 1, pp: 1, gf: 4, gc: 7, dg: -3, pts: 1, forma: ['E', 'D'] },
  // Sub-9
  { equipoId: 'eq-11', categoriaId: 'cat-3', pj: 1, pg: 1, pe: 0, pp: 0, gf: 2, gc: 1, dg: 1, pts: 3, forma: ['V'] },
  { equipoId: 'eq-13', categoriaId: 'cat-3', pj: 1, pg: 1, pe: 0, pp: 0, gf: 3, gc: 2, dg: 1, pts: 3, forma: ['V'] },
  { equipoId: 'eq-15', categoriaId: 'cat-3', pj: 1, pg: 1, pe: 0, pp: 0, gf: 1, gc: 0, dg: 1, pts: 3, forma: ['V'] },
  { equipoId: 'eq-12', categoriaId: 'cat-3', pj: 1, pg: 0, pe: 0, pp: 1, gf: 1, gc: 2, dg: -1, pts: 0, forma: ['D'] },
  { equipoId: 'eq-14', categoriaId: 'cat-3', pj: 1, pg: 0, pe: 0, pp: 1, gf: 2, gc: 3, dg: -1, pts: 0, forma: ['D'] },
  { equipoId: 'eq-16', categoriaId: 'cat-3', pj: 1, pg: 0, pe: 0, pp: 1, gf: 0, gc: 1, dg: -1, pts: 0, forma: ['D'] },
]

export const goleadores: Goleador[] = [
  { jugadorId: 'jug-1', nombre: 'Santiago García', equipoId: 'eq-1', equipoNombre: 'Deportivo Águilas', goles: 5 },
  { jugadorId: 'jug-13', nombre: 'Tomás Pérez', equipoId: 'eq-2', equipoNombre: 'FC Tigres', goles: 4 },
  { jugadorId: 'jug-2', nombre: 'Mateo López', equipoId: 'eq-1', equipoNombre: 'Deportivo Águilas', goles: 3 },
  { jugadorId: 'jug-14', nombre: 'Emilio Sánchez', equipoId: 'eq-2', equipoNombre: 'FC Tigres', goles: 3 },
  { jugadorId: 'jug-4', nombre: 'Sebastián Rodríguez', equipoId: 'eq-1', equipoNombre: 'Deportivo Águilas', goles: 2 },
  { jugadorId: 'jug-15', nombre: 'Gabriel Ruiz', equipoId: 'eq-2', equipoNombre: 'FC Tigres', goles: 2 },
  { jugadorId: 'jug-5', nombre: 'Nicolás Hernández', equipoId: 'eq-1', equipoNombre: 'Deportivo Águilas', goles: 1 },
  { jugadorId: 'jug-16', nombre: 'Pablo Jiménez', equipoId: 'eq-2', equipoNombre: 'FC Tigres', goles: 1 },
]

export const playoffBrackets: PlayoffBracket[] = [
  {
    categoriaId: 'cat-2',
    semifinal1: {
      equipo1Id: 'eq-1',
      equipo2Id: 'eq-8',
      golesEquipo1: 2,
      golesEquipo2: 1,
      ganadorId: 'eq-1',
    },
    semifinal2: {
      equipo1Id: 'eq-5',
      equipo2Id: 'eq-2',
      golesEquipo1: 3,
      golesEquipo2: 2,
      ganadorId: 'eq-5',
    },
    final: {
      equipo1Id: 'eq-1',
      equipo2Id: 'eq-5',
    },
  },
]

export const tarjetasMock = [
  { jugadorId: 'jug-3', nombre: 'Daniel Martínez', equipoNombre: 'Deportivo Águilas', amarillas: 2, rojas: 0 },
  { jugadorId: 'jug-14', nombre: 'Emilio Sánchez', equipoNombre: 'FC Tigres', amarillas: 2, rojas: 0 },
  { jugadorId: 'jug-5', nombre: 'Nicolás Hernández', equipoNombre: 'Deportivo Águilas', amarillas: 1, rojas: 1 },
  { jugadorId: 'jug-16', nombre: 'Pablo Jiménez', equipoNombre: 'FC Tigres', amarillas: 1, rojas: 0 },
  { jugadorId: 'jug-7', nombre: 'Andrés Ramírez', equipoNombre: 'Deportivo Águilas', amarillas: 1, rojas: 0 },
]

// Helper functions
export const getEquipoById = (id: string): Equipo | undefined => equipos.find(e => e.id === id)
export const getCategoriaById = (id: string): Categoria | undefined => categorias.find(c => c.id === id)
export const getArbitroById = (id: string): Arbitro | undefined => arbitros.find(a => a.id === id)
export const getEquiposByCategoriaId = (categoriaId: string): Equipo[] => equipos.filter(e => e.categoriaId === categoriaId)
export const getJugadoresByEquipoId = (equipoId: string): Jugador[] => jugadores.filter(j => j.equipoId === equipoId)
export const getPartidosByCategoriaId = (categoriaId: string): Partido[] => partidos.filter(p => p.categoriaId === categoriaId)
export const getEstadisticasByCategoriaId = (categoriaId: string): EstadisticasEquipo[] => 
  estadisticasEquipos.filter(e => e.categoriaId === categoriaId).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.dg !== a.dg) return b.dg - a.dg
    return b.gf - a.gf
  })

export const configuracionTorneo = {
  nombreTorneo: 'Copa Primavera 2024',
  organizacion: 'Liga Infantil de Fútbol',
  modoOscuro: false,
}

// Financial summary helpers
export const calcularResumenFinanciero = () => {
  const ingresosEsperados = categorias.reduce((acc, cat) => {
    const equiposCat = equipos.filter(e => e.categoriaId === cat.id)
    return acc + (equiposCat.length * cat.valorInscripcion)
  }, 0)

  const ingresosCobrados = abonos.reduce((acc, ab) => acc + ab.valor, 0)
  const carteraPendiente = ingresosEsperados - ingresosCobrados
  const totalEgresos = egresos.reduce((acc, eg) => acc + eg.valor, 0)
  const resultado = ingresosCobrados - totalEgresos

  return {
    ingresosEsperados,
    ingresosCobrados,
    carteraPendiente,
    totalEgresos,
    resultado,
  }
}

export const calcularResumenArbitrajes = () => {
  const totalPartidosArbitrados = arbitrajePagos.length
  const totalPagado = arbitrajePagos.filter(ap => ap.pagado).reduce((acc, ap) => acc + ap.valor, 0)
  const totalPendiente = arbitrajePagos.filter(ap => !ap.pagado).reduce((acc, ap) => acc + ap.valor, 0)

  return {
    totalPartidosArbitrados,
    totalPagado,
    totalPendiente,
  }
}
