import { supabase } from '@/lib/supabase'
import type { EstadoJugador, JugadorRow } from '@/types/database'
import type { Jugador } from '@/types/torneo'
import { getEquipoById } from '@/features/equipos/equiposService'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function mapJugadorUi(row: JugadorRow, equipoId: string, categoriaId: string): Jugador {
  let estado: Jugador['estado'] = 'activo'
  let advertencia: string | undefined
  if (row.estado === 'inactivo') {
    estado = 'inactivo'
  } else if (row.estado === 'suspendido' || row.estado === 'pendiente_validacion') {
    estado = 'advertencia'
    advertencia = row.observaciones ?? (row.estado === 'suspendido' ? 'Suspendido' : 'Pendiente de validación')
  }

  const anio =
    row.anio_nacimiento ??
    (row.fecha_nacimiento ? Number(row.fecha_nacimiento.slice(0, 4)) : new Date().getFullYear())

  return {
    id: row.id,
    nombre: row.nombre_completo,
    documento: row.documento?.trim() || '—',
    anioNacimiento: anio,
    equipoId,
    categoriaId,
    estado,
    advertencia,
  }
}

type JugadorJoinRow = {
  id: string
  equipo_id: string
  jugadores: JugadorRow | null
}

type EquipoJugadorJoin = { equipo_id: string; jugadores: JugadorRow | JugadorRow[] | null }

function unwrapNestedJugador(j: JugadorRow | JugadorRow[] | null | undefined): JugadorRow | null {
  if (j == null) return null
  return Array.isArray(j) ? (j[0] ?? null) : j
}

export async function getJugadoresByEquipo(equipoId: string, categoriaId: string): Promise<Jugador[]> {
  const result = await supabase
    .from('jugador_equipos')
    .select(
      `
      id,
      equipo_id,
      jugadores (
        id,
        torneo_id,
        nombres,
        apellidos,
        nombre_completo,
        tipo_documento,
        documento,
        fecha_nacimiento,
        anio_nacimiento,
        foto_url,
        estado,
        observaciones,
        created_at,
        updated_at
      )
    `,
    )
    .eq('equipo_id', equipoId)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = throwOnError(result) as unknown as JugadorJoinRow[]
  return rows
    .map((r) => {
      const jr = unwrapNestedJugador(r.jugadores as JugadorRow | JugadorRow[] | null)
      return jr ? mapJugadorUi(jr, r.equipo_id, categoriaId) : null
    })
    .filter((j): j is Jugador => j !== null)
}

/** Todos los jugadores con membresía activa en equipos de la categoría (una sola consulta). */
export async function getJugadoresActivosPorCategoria(categoriaId: string): Promise<
  (Jugador & { equipoNombre: string; equipoColor: string })[]
> {
  const eq = await supabase.from('equipos').select('id, nombre, color').eq('categoria_id', categoriaId)
  const equiposRows = throwOnError(eq) as { id: string; nombre: string; color: string | null }[]
  const ids = equiposRows.map((e) => e.id)
  const meta = new Map(
    equiposRows.map((e) => [e.id, { nombre: e.nombre, color: e.color ?? '#64748b' }] as const),
  )
  if (ids.length === 0) return []

  const result = await supabase
    .from('jugador_equipos')
    .select(
      `
      equipo_id,
      jugadores (
        id,
        torneo_id,
        nombres,
        apellidos,
        nombre_completo,
        tipo_documento,
        documento,
        fecha_nacimiento,
        anio_nacimiento,
        foto_url,
        estado,
        observaciones,
        created_at,
        updated_at
      )
    `,
    )
    .in('equipo_id', ids)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = throwOnError(result) as unknown as EquipoJugadorJoin[]
  return rows
    .map((r) => {
      const jr = unwrapNestedJugador(r.jugadores)
      if (!jr) return null
      const j = mapJugadorUi(jr, r.equipo_id, categoriaId)
      const m = meta.get(r.equipo_id)
      return {
        ...j,
        equipoNombre: m?.nombre ?? '',
        equipoColor: m?.color ?? '#64748b',
      }
    })
    .filter((j): j is Jugador & { equipoNombre: string; equipoColor: string } => j !== null)
}

export type JugadorCreateInput = {
  nombre_completo: string
  documento?: string | null
  anio_nacimiento?: number | null
  fecha_nacimiento?: string | null
  tipo_documento?: string | null
  observaciones?: string | null
}

export async function createJugadorConEquipo(
  jugadorData: JugadorCreateInput,
  equipoId: string,
): Promise<JugadorRow> {
  const nombreCompleto = jugadorData.nombre_completo.trim()
  if (!nombreCompleto) {
    throw new Error('El nombre completo es obligatorio')
  }

  const equipo = await getEquipoById(equipoId)
  if (!equipo) {
    throw new Error('Equipo no encontrado')
  }

  const torneoId = equipo.torneo_id
  const doc = jugadorData.documento?.trim() || null
  if (doc) {
    const dup = await supabase.from('jugadores').select('id').eq('torneo_id', torneoId).eq('documento', doc).maybeSingle()
    if (dup.error) throw new Error(dup.error.message)
    if (dup.data) {
      throw new Error('Ya existe un jugador con este documento en el torneo')
    }
  }

  const parts = nombreCompleto.split(/\s+/)
  const nombres = parts[0] ?? nombreCompleto
  const apellidos = parts.length > 1 ? parts.slice(1).join(' ') : null

  const insertJugador = {
    torneo_id: torneoId,
    nombres,
    apellidos,
    nombre_completo: nombreCompleto,
    documento: doc,
    tipo_documento: jugadorData.tipo_documento ?? null,
    anio_nacimiento: jugadorData.anio_nacimiento ?? null,
    fecha_nacimiento: jugadorData.fecha_nacimiento ?? null,
    observaciones: jugadorData.observaciones ?? null,
    estado: 'activo' as EstadoJugador,
  }

  const ins = await supabase.from('jugadores').insert(insertJugador).select('*').single()
  const jugador = throwOnError(ins) as JugadorRow

  const je = await supabase
    .from('jugador_equipos')
    .insert({
      jugador_id: jugador.id,
      equipo_id: equipoId,
      fecha_inicio: todayDateString(),
      estado: 'activo',
    })
    .select('id')
    .single()

  if (je.error) {
    throw new Error(je.error.message)
  }

  return jugador
}

export type JugadorUpdateInput = Partial<{
  nombre_completo: string
  documento: string | null
  anio_nacimiento: number | null
  fecha_nacimiento: string | null
  tipo_documento: string | null
  observaciones: string | null
  estado: EstadoJugador
}>

export async function updateJugador(id: string, data: JugadorUpdateInput): Promise<JugadorRow> {
  const patch: Record<string, unknown> = {}
  if (data.nombre_completo !== undefined) {
    const nc = data.nombre_completo.trim()
    patch.nombre_completo = nc
    const parts = nc.split(/\s+/)
    patch.nombres = parts[0] ?? nc
    patch.apellidos = parts.length > 1 ? parts.slice(1).join(' ') : null
  }
  if (data.documento !== undefined) patch.documento = data.documento
  if (data.anio_nacimiento !== undefined) patch.anio_nacimiento = data.anio_nacimiento
  if (data.fecha_nacimiento !== undefined) patch.fecha_nacimiento = data.fecha_nacimiento
  if (data.tipo_documento !== undefined) patch.tipo_documento = data.tipo_documento
  if (data.observaciones !== undefined) patch.observaciones = data.observaciones
  if (data.estado !== undefined) patch.estado = data.estado

  const result = await supabase.from('jugadores').update(patch).eq('id', id).select('*').single()
  return throwOnError(result) as JugadorRow
}

export async function cambiarJugadorDeEquipo(
  jugadorId: string,
  equipoNuevoId: string,
  motivo: string,
): Promise<void> {
  const list = await supabase
    .from('jugador_equipos')
    .select('id')
    .eq('jugador_id', jugadorId)
    .eq('estado', 'activo')
    .is('fecha_fin', null)
    .limit(1)

  const rows = throwOnError(list) as { id: string }[]
  const membresia = rows[0]
  if (!membresia) {
    throw new Error('No hay una membresía activa para este jugador')
  }

  const up = await supabase
    .from('jugador_equipos')
    .update({
      fecha_fin: todayDateString(),
      estado: 'transferido',
      motivo_cambio: motivo.trim() || 'Cambio de equipo',
    })
    .eq('id', membresia.id)

  if (up.error) {
    throw new Error(up.error.message)
  }

  const ins = await supabase.from('jugador_equipos').insert({
    jugador_id: jugadorId,
    equipo_id: equipoNuevoId,
    fecha_inicio: todayDateString(),
    estado: 'activo',
  })

  if (ins.error) {
    throw new Error(ins.error.message)
  }
}

export async function desactivarJugador(jugadorId: string): Promise<void> {
  const upJ = await supabase.from('jugadores').update({ estado: 'inactivo' }).eq('id', jugadorId)
  if (upJ.error) throw new Error(upJ.error.message)

  const list = await supabase
    .from('jugador_equipos')
    .select('id')
    .eq('jugador_id', jugadorId)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = throwOnError(list) as { id: string }[]
  for (const r of rows) {
    const up = await supabase
      .from('jugador_equipos')
      .update({
        fecha_fin: todayDateString(),
        estado: 'retirado',
        motivo_cambio: 'Jugador desactivado',
      })
      .eq('id', r.id)
    if (up.error) throw new Error(up.error.message)
  }
}
