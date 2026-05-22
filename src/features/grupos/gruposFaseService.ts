import { supabase } from '@/lib/supabase'
import { asRow, pickNum, pickStr, throwOnError } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import { formatHoraUi } from '@/features/horarios/horariosService'

export type GrupoFaseUi = {
  id: string
  faseTorneoId: string
  nombre: string
  orden: number
  equiposCount: number
  partidosCount: number
  partidosJugados: number
}

export type GrupoEquipoUi = {
  id: string
  grupoId: string
  faseTorneoId: string
  equipoId: string
  equipoNombre: string
  equipoColor: string | null
  logoUrl: string | null
  logoPublicId: string | null
}

export type FixtureGrupoUi = {
  partidoId: string
  grupoId: string
  grupoNombre: string
  grupoOrden: number
  jornada: number
  orden: number
  estado: string
  fecha: string
  hora: string
  cancha: string
  equipoLocalNombre: string
  equipoVisitanteNombre: string
  golesLocal: number | null
  golesVisitante: number | null
}

export function isFasePorGrupos(tipo?: string | null): boolean {
  const normalized = String(tipo ?? '').toLowerCase()
  return normalized === 'fase_grupos' || normalized === 'cuadrangulares'
}

function mapGrupo(rowRaw: unknown): GrupoFaseUi {
  const row = asRow(rowRaw)
  const id = pickStr(row, 'grupo_id', 'id')
  return {
    id,
    faseTorneoId: pickStr(row, 'fase_torneo_id', 'fase_id'),
    nombre: pickStr(row, 'grupo_nombre', 'nombre_grupo', 'nombre') || 'Grupo',
    orden: pickNum(row, 'grupo_orden', 'orden'),
    equiposCount: pickNum(row, 'equipos_count', 'equipos_total', 'cantidad_equipos', 'total_equipos'),
    partidosCount: pickNum(row, 'partidos_count', 'partidos_total', 'cantidad_partidos', 'total_partidos'),
    partidosJugados: pickNum(row, 'partidos_jugados', 'jugados'),
  }
}

function mapGrupoEquipo(rowRaw: unknown): GrupoEquipoUi {
  const row = asRow(rowRaw)
  return {
    id: pickStr(row, 'grupo_equipo_id', 'id'),
    grupoId: pickStr(row, 'grupo_id'),
    faseTorneoId: pickStr(row, 'fase_torneo_id', 'fase_id'),
    equipoId: pickStr(row, 'equipo_id'),
    equipoNombre: pickStr(row, 'equipo_nombre', 'nombre_equipo', 'nombre') || 'Equipo',
    equipoColor: pickStr(row, 'equipo_color', 'color') || null,
    logoUrl: pickStr(row, 'logo_url', 'equipo_logo_url') || null,
    logoPublicId: pickStr(row, 'logo_public_id', 'equipo_logo_public_id') || null,
  }
}

function mapFixtureGrupo(rowRaw: unknown): FixtureGrupoUi {
  const row = asRow(rowRaw)
  const fecha = pickStr(row, 'fecha', 'fecha_programada', 'fecha_fixture').slice(0, 10)
  const horaDb = pickStr(row, 'hora', 'hora_inicio')
  return {
    partidoId: pickStr(row, 'partido_id', 'id'),
    grupoId: pickStr(row, 'grupo_id'),
    grupoNombre: pickStr(row, 'grupo', 'grupo_nombre', 'nombre_grupo') || 'Sin grupo asignado',
    grupoOrden: pickNum(row, 'grupo_orden', 'orden_grupo'),
    jornada: pickNum(row, 'jornada', 'numero_jornada'),
    orden: pickNum(row, 'orden', 'orden_partido'),
    estado: pickStr(row, 'estado', 'estado_partido') || 'pendiente_programar',
    fecha,
    hora: horaDb ? formatHoraUi(horaDb) : '',
    cancha: pickStr(row, 'cancha', 'cancha_nombre', 'nombre_cancha'),
    equipoLocalNombre: pickStr(row, 'equipo_local_nombre', 'local_nombre', 'equipo_local') || 'Local',
    equipoVisitanteNombre: pickStr(row, 'equipo_visitante_nombre', 'visitante_nombre', 'equipo_visitante') || 'Visitante',
    golesLocal: row.goles_local == null ? null : Number(row.goles_local),
    golesVisitante: row.goles_visitante == null ? null : Number(row.goles_visitante),
  }
}

export async function listGruposFase(faseTorneoId: string): Promise<GrupoFaseUi[]> {
  const view = await supabase
    .from('vw_grupos_fase_detalle')
    .select('*')
    .eq('fase_torneo_id', faseTorneoId)

  if (!view.error) {
    return (view.data ?? []).map(mapGrupo).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  }

  const table = await supabase
    .from('grupos_fase')
    .select('*')
    .eq('fase_torneo_id', faseTorneoId)
    .order('orden', { ascending: true })
  if (table.error) throw toUserError(table.error, 'fixture')
  return (table.data ?? []).map(mapGrupo)
}

export async function listGrupoEquipos(faseTorneoId: string): Promise<GrupoEquipoUi[]> {
  const view = await supabase
    .from('vw_grupo_equipos_detalle')
    .select('*')
    .eq('fase_torneo_id', faseTorneoId)

  if (!view.error) {
    return (view.data ?? []).map(mapGrupoEquipo).sort((a, b) => a.grupoId.localeCompare(b.grupoId) || a.equipoNombre.localeCompare(b.equipoNombre))
  }

  const grupos = await listGruposFase(faseTorneoId)
  if (!grupos.length) return []
  const rows = throwOnError(
    await supabase.from('grupo_equipos').select('id, grupo_id, equipo_id').in('grupo_id', grupos.map((g) => g.id)),
  ) as { id: string; grupo_id: string; equipo_id: string }[]
  if (!rows.length) return []
  const equipos = throwOnError(
    await supabase.from('equipos').select('id, nombre, color, logo_url, logo_public_id').in('id', rows.map((r) => r.equipo_id)),
  ) as { id: string; nombre: string; color: string | null; logo_url: string | null; logo_public_id: string | null }[]
  const equipoMap = new Map(equipos.map((e) => [e.id, e]))
  const faseMap = new Map(grupos.map((g) => [g.id, g.faseTorneoId]))
  return rows.map((row) => {
    const equipo = equipoMap.get(row.equipo_id)
    return {
      id: row.id,
      grupoId: row.grupo_id,
      faseTorneoId: faseMap.get(row.grupo_id) ?? faseTorneoId,
      equipoId: row.equipo_id,
      equipoNombre: equipo?.nombre ?? 'Equipo',
      equipoColor: equipo?.color ?? null,
      logoUrl: equipo?.logo_url ?? null,
      logoPublicId: equipo?.logo_public_id ?? null,
    }
  })
}

export async function listFixtureGruposFase(faseTorneoId: string): Promise<FixtureGrupoUi[]> {
  const view = await supabase
    .from('vw_fixture_grupos_detalle')
    .select('*')
    .eq('fase_torneo_id', faseTorneoId)
    .order('grupo_orden', { ascending: true })
    .order('jornada', { ascending: true })
    .order('orden', { ascending: true })

  if (view.error) throw toUserError(view.error, 'fixture')
  return (view.data ?? []).map(mapFixtureGrupo)
}

export async function crearGruposFase(faseTorneoId: string, cantidad: number): Promise<void> {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error('Indica una cantidad de grupos válida.')
  }
  const variants = [
    { p_fase_torneo_id: faseTorneoId, p_cantidad_grupos: cantidad },
    { fase_torneo_id: faseTorneoId, cantidad_grupos: cantidad },
    { p_fase_torneo_id: faseTorneoId, p_cantidad: cantidad },
  ]
  let last: unknown = null
  for (const args of variants) {
    const { error } = await supabase.rpc('crear_grupos_fase', args)
    if (!error) return
    last = error
  }
  throw toUserError(last, 'fixture')
}

export async function repartirEquiposAleatorioFase(faseTorneoId: string): Promise<void> {
  const { error } = await supabase.rpc('repartir_equipos_aleatorio_fase', { p_fase_torneo_id: faseTorneoId })
  if (error) throw toUserError(error, 'fixture')
}

export async function generarFixtureGruposFase(faseTorneoId: string, idaVuelta = false): Promise<void> {
  const { error } = await supabase.rpc('generar_fixture_grupos_fase', {
    p_fase_torneo_id: faseTorneoId,
    p_ida_vuelta: idaVuelta,
  })
  if (error) throw toUserError(error, 'fixture')
}

async function assertEquipoLibreEnFase(faseTorneoId: string, equipoId: string, excludeGrupoEquipoId?: string): Promise<void> {
  const grupos = await listGruposFase(faseTorneoId)
  if (!grupos.length) return
  const r = await supabase
    .from('grupo_equipos')
    .select('id, grupo_id')
    .in('grupo_id', grupos.map((g) => g.id))
    .eq('equipo_id', equipoId)
  if (r.error) throw toUserError(r.error, 'fixture')
  const duplicated = ((r.data ?? []) as { id: string }[]).some((row) => row.id !== excludeGrupoEquipoId)
  if (duplicated) throw new Error('Este equipo ya pertenece a otro grupo de esta fase.')
}

export async function agregarEquipoAGrupo(faseTorneoId: string, grupoId: string, equipoId: string): Promise<void> {
  if (!grupoId || !equipoId) throw new Error('Selecciona grupo y equipo.')
  await assertEquipoLibreEnFase(faseTorneoId, equipoId)
  const r = await supabase.from('grupo_equipos').insert({ grupo_id: grupoId, equipo_id: equipoId })
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function quitarEquipoDeGrupo(grupoEquipoId: string): Promise<void> {
  const r = await supabase.from('grupo_equipos').delete().eq('id', grupoEquipoId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function quitarEquipoDeGrupoSeguro(grupoId: string, equipoId: string): Promise<void> {
  const { error } = await supabase.rpc('quitar_equipo_de_grupo', {
    p_grupo_id: grupoId,
    p_equipo_id: equipoId,
  })
  if (error) throw toUserError(error, 'fixture')
}

export async function agregarEquiposRestantesAGrupo(grupoId: string): Promise<void> {
  const { error } = await supabase.rpc('agregar_equipos_restantes_a_grupo', { p_grupo_id: grupoId })
  if (error) throw toUserError(error, 'fixture')
}

export async function moverEquipoAGrupo(
  faseTorneoId: string,
  grupoEquipoId: string,
  equipoId: string,
  targetGrupoId: string,
): Promise<void> {
  if (!targetGrupoId) throw new Error('Selecciona el grupo destino.')
  await assertEquipoLibreEnFase(faseTorneoId, equipoId, grupoEquipoId)
  const r = await supabase.from('grupo_equipos').update({ grupo_id: targetGrupoId }).eq('id', grupoEquipoId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function updateGrupoNombre(grupoId: string, nombre: string): Promise<void> {
  if (!nombre.trim()) throw new Error('Indica un nombre para el grupo.')
  const r = await supabase.from('grupos_fase').update({ nombre: nombre.trim() }).eq('id', grupoId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function deleteGrupoVacio(grupoId: string): Promise<void> {
  const c = await supabase.from('grupo_equipos').select('id', { count: 'exact', head: true }).eq('grupo_id', grupoId)
  if (c.error) throw toUserError(c.error, 'fixture')
  if ((c.count ?? 0) > 0) throw new Error('Solo puedes eliminar grupos vacíos.')
  const r = await supabase.from('grupos_fase').delete().eq('id', grupoId)
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function eliminarGrupoFaseSeguro(grupoId: string): Promise<void> {
  const { error } = await supabase.rpc('eliminar_grupo_fase_seguro', { p_grupo_id: grupoId })
  if (error) throw toUserError(error, 'fixture')
}

export async function validarGruposAntesDeFixture(faseTorneoId: string): Promise<void> {
  const [grupos, equipos, fixture] = await Promise.all([
    listGruposFase(faseTorneoId),
    listGrupoEquipos(faseTorneoId),
    listFixtureGruposFase(faseTorneoId),
  ])
  if (!grupos.length) throw new Error('Primero debes crear los grupos de esta fase.')
  const equiposPorGrupo = new Map<string, number>()
  for (const equipo of equipos) {
    equiposPorGrupo.set(equipo.grupoId, (equiposPorGrupo.get(equipo.grupoId) ?? 0) + 1)
  }
  if (grupos.some((grupo) => (equiposPorGrupo.get(grupo.id) ?? 0) < 2)) {
    throw new Error('Todos los grupos deben tener al menos dos equipos.')
  }
  if (fixture.length > 0) throw new Error('Esta fase ya tiene fixture generado.')
}
