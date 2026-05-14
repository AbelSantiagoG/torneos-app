import { supabase } from '@/lib/supabase'
import type { EstadoJugador, JugadorRow } from '@/types/database'
import type { Jugador } from '@/types/torneo'
import { getCategoriaById } from '@/features/categorias/categoriasService'
import { getEquipoById } from '@/features/equipos/equiposService'
import { validarEdadCategoria } from '@/lib/jugadorEdad'
import { assertNoSupabaseError, toUserError } from '@/lib/supabaseErrors'

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

const JUGADOR_ROW_SELECT = `
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
        foto_public_id,
        estado,
        observaciones,
        created_at,
        updated_at
      `

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
    fotoUrl: row.foto_url ?? null,
    fotoPublicId: row.foto_public_id ?? null,
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
        ${JUGADOR_ROW_SELECT}
      )
    `,
    )
    .eq('equipo_id', equipoId)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = assertNoSupabaseError(result, 'jugador') as unknown as JugadorJoinRow[]
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
  const equiposRows = assertNoSupabaseError(eq, 'equipo') as { id: string; nombre: string; color: string | null }[]
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
        ${JUGADOR_ROW_SELECT}
      )
    `,
    )
    .in('equipo_id', ids)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = assertNoSupabaseError(result, 'jugador') as unknown as EquipoJugadorJoin[]
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
  documento: string
  anio_nacimiento: number
  fecha_nacimiento?: string | null
  tipo_documento?: string | null
  observaciones?: string | null
  foto_url?: string | null
  foto_public_id?: string | null
}

export async function createJugadorConEquipo(
  jugadorData: JugadorCreateInput,
  equipoId: string,
): Promise<JugadorRow> {
  const nombreCompleto = jugadorData.nombre_completo.trim()
  if (!nombreCompleto) {
    throw new Error('El nombre completo es obligatorio.')
  }

  const equipo = await getEquipoById(equipoId)
  if (!equipo) {
    throw new Error('Equipo no encontrado.')
  }

  const torneoId = equipo.torneo_id
  const doc = jugadorData.documento.trim()
  if (!doc) {
    throw new Error('El documento es obligatorio.')
  }

  const anio = jugadorData.anio_nacimiento
  if (anio == null || Number.isNaN(Number(anio)) || anio < 1900 || anio > new Date().getFullYear()) {
    throw new Error('El año de nacimiento no es válido.')
  }

  const cat = await getCategoriaById(equipo.categoria_id)
  const edadMsg = validarEdadCategoria(anio, cat?.edad_max ?? null)
  if (edadMsg) {
    throw new Error(edadMsg)
  }

  const dup = await supabase.from('jugadores').select('id').eq('torneo_id', torneoId).eq('documento', doc).maybeSingle()
  assertNoSupabaseError(dup, 'jugador')
  if (dup.data) {
    throw new Error('Ya existe un jugador con ese documento en este torneo.')
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
    anio_nacimiento: anio,
    fecha_nacimiento: jugadorData.fecha_nacimiento ?? null,
    observaciones: jugadorData.observaciones ?? null,
    foto_url: jugadorData.foto_url ?? null,
    foto_public_id: jugadorData.foto_public_id ?? null,
    estado: 'activo' as EstadoJugador,
  }

  const ins = await supabase.from('jugadores').insert(insertJugador).select('*').single()
  const jugador = assertNoSupabaseError(ins, 'jugador') as JugadorRow

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

  assertNoSupabaseError(je, 'jugador')

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
  foto_url: string | null
  foto_public_id: string | null
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
  if (data.foto_url !== undefined) patch.foto_url = data.foto_url
  if (data.foto_public_id !== undefined) patch.foto_public_id = data.foto_public_id

  const result = await supabase.from('jugadores').update(patch).eq('id', id).select('*').single()
  return assertNoSupabaseError(result, 'jugador') as JugadorRow
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

  const rows = assertNoSupabaseError(list, 'jugador') as { id: string }[]
  const membresia = rows[0]
  if (!membresia) {
    throw new Error('No hay una membresía activa para este jugador.')
  }

  const up = await supabase
    .from('jugador_equipos')
    .update({
      fecha_fin: todayDateString(),
      estado: 'transferido',
      motivo_cambio: motivo.trim() || 'Cambio de equipo',
    })
    .eq('id', membresia.id)

  assertNoSupabaseError(up, 'jugador')

  const ins = await supabase.from('jugador_equipos').insert({
    jugador_id: jugadorId,
    equipo_id: equipoNuevoId,
    fecha_inicio: todayDateString(),
    estado: 'activo',
  })

  assertNoSupabaseError(ins, 'jugador')
}

export async function eliminarJugador(jugadorId: string): Promise<void> {
  const gl = await supabase.from('goles').delete().eq('jugador_id', jugadorId)
  if (gl.error) throw toUserError(gl.error, 'jugador')
  const tj = await supabase.from('tarjetas').delete().eq('jugador_id', jugadorId)
  if (tj.error) throw toUserError(tj.error, 'jugador')
  const je = await supabase.from('jugador_equipos').delete().eq('jugador_id', jugadorId)
  if (je.error) throw toUserError(je.error, 'jugador')
  const j = await supabase.from('jugadores').delete().eq('id', jugadorId)
  if (j.error) throw toUserError(j.error, 'jugador')
}

export async function desactivarJugador(jugadorId: string): Promise<void> {
  const upJ = await supabase.from('jugadores').update({ estado: 'inactivo' }).eq('id', jugadorId)
  assertNoSupabaseError(upJ, 'jugador')

  const list = await supabase
    .from('jugador_equipos')
    .select('id')
    .eq('jugador_id', jugadorId)
    .eq('estado', 'activo')
    .is('fecha_fin', null)

  const rows = assertNoSupabaseError(list, 'jugador') as { id: string }[]
  for (const r of rows) {
    const up = await supabase
      .from('jugador_equipos')
      .update({
        fecha_fin: todayDateString(),
        estado: 'retirado',
        motivo_cambio: 'Jugador desactivado',
      })
      .eq('id', r.id)
    assertNoSupabaseError(up, 'jugador')
  }
}
