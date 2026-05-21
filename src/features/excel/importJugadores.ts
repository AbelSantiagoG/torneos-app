import { getCategoriaById } from '@/features/categorias/categoriasService'
import { getEquipoById } from '@/features/equipos/equiposService'
import { hasCellValue, pickCell, pickRawCell } from '@/features/excel/parseSheet'
import { supabase } from '@/lib/supabase'
import { validarEdadCategoria } from '@/lib/jugadorEdad'
import { parseDateFlexible } from '@/lib/parseDateFlexible'
import { toUserError } from '@/lib/supabaseErrors'

export type ImportJugadoresResult = {
  creados: number
  omitidos: string[]
  errores: { fila: number; mensaje: string }[]
  validos?: number
}

type ValidJugadorImport = {
  fila: number
  nombreCompleto: string
  documento: string
  anio: number
  fechaIso: string
  fotoUrl: string | null
  observaciones: string | null
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

function splitNombre(nombreCompleto: string): { nombres: string; apellidos: string | null } {
  const parts = nombreCompleto.trim().split(/\s+/)
  return {
    nombres: parts[0] ?? nombreCompleto,
    apellidos: parts.length > 1 ? parts.slice(1).join(' ') : null,
  }
}

export async function importJugadoresFromRows(
  rows: Record<string, unknown>[],
  equipoId: string,
): Promise<ImportJugadoresResult> {
  const omitidos: string[] = []
  const errores: { fila: number; mensaje: string }[] = []
  const validos: ValidJugadorImport[] = []

  const equipo = await getEquipoById(equipoId)
  if (!equipo) {
    return { creados: 0, omitidos: [], errores: [{ fila: 0, mensaje: 'Equipo no encontrado.' }], validos: 0 }
  }

  const categoria = await getCategoriaById(equipo.categoria_id)
  const edadMax = categoria?.edad_max ?? null

  const existentesRes = await supabase
    .from('jugadores')
    .select('documento')
    .eq('torneo_id', equipo.torneo_id)
    .not('documento', 'is', null)
  if (existentesRes.error) throw toUserError(existentesRes.error, 'jugador')
  const docsExistentes = new Set(
    ((existentesRes.data ?? []) as { documento: string | null }[])
      .map((row) => row.documento?.trim().toLowerCase())
      .filter((doc): doc is string => Boolean(doc)),
  )
  const docsEnArchivo = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const fila = i + 2
    const nombreCompleto = pickCell(row, 'nombre_completo', 'nombre', 'jugador', 'full_name', 'nombres')
    const documento = pickCell(row, 'documento', 'doc', 'cedula', 'dni')
    const fechaNacRaw = pickRawCell(row, 'fecha_nacimiento', 'fecha nacimiento', 'birthdate')
    const fechaIso = parseDateFlexible(fechaNacRaw)
    const fotoUrl = pickCell(row, 'foto_url', 'foto', 'imagen', 'url_foto')
    const observaciones = pickCell(row, 'observaciones', 'notas', 'notes')

    if (!nombreCompleto) {
      errores.push({ fila, mensaje: 'Falta nombre_completo.' })
      continue
    }
    if (!documento) {
      errores.push({ fila, mensaje: 'Falta documento.' })
      continue
    }
    if (!hasCellValue(row, 'fecha_nacimiento', 'fecha nacimiento', 'birthdate') || !fechaIso) {
      errores.push({ fila, mensaje: 'La fecha del jugador no tiene un formato válido.' })
      continue
    }

    const anio = Number(fechaIso.slice(0, 4))
    const docKey = documento.toLowerCase()
    if (docsEnArchivo.has(docKey)) {
      omitidos.push(`${documento} (duplicado en el archivo)`)
      continue
    }
    if (docsExistentes.has(docKey)) {
      omitidos.push(`${documento} (${nombreCompleto})`)
      continue
    }
    docsEnArchivo.add(docKey)

    const edadMsg = validarEdadCategoria(anio, edadMax)
    if (edadMsg) {
      errores.push({ fila, mensaje: edadMsg })
      continue
    }

    validos.push({
      fila,
      nombreCompleto,
      documento,
      anio,
      fechaIso,
      fotoUrl: fotoUrl?.trim() || null,
      observaciones: observaciones || null,
    })
  }

  if (!validos.length) {
    return { creados: 0, omitidos, errores, validos: 0 }
  }

  try {
    const jugadoresInsert = validos.map((j) => {
      const nombre = splitNombre(j.nombreCompleto)
      return {
        torneo_id: equipo.torneo_id,
        nombres: nombre.nombres,
        apellidos: nombre.apellidos,
        nombre_completo: j.nombreCompleto,
        documento: j.documento,
        tipo_documento: null,
        anio_nacimiento: j.anio,
        fecha_nacimiento: j.fechaIso,
        observaciones: j.observaciones,
        foto_url: j.fotoUrl,
        foto_public_id: null,
        estado: 'activo',
      }
    })

    const ins = await supabase.from('jugadores').insert(jugadoresInsert).select('id, documento')
    if (ins.error) throw toUserError(ins.error, 'jugador')
    const creadosRows = (ins.data ?? []) as { id: string; documento: string | null }[]
    const membresias = creadosRows.map((jugador) => ({
      jugador_id: jugador.id,
      equipo_id: equipoId,
      fecha_inicio: todayDateString(),
      estado: 'activo',
    }))
    if (membresias.length) {
      const je = await supabase.from('jugador_equipos').insert(membresias)
      if (je.error) throw toUserError(je.error, 'jugador')
    }

    return { creados: creadosRows.length, omitidos, errores, validos: validos.length }
  } catch {
    return {
      creados: 0,
      omitidos,
      errores: [
        ...errores,
        { fila: 0, mensaje: 'No se pudo importar el lote de jugadores. Revisa los datos.' },
      ],
      validos: validos.length,
    }
  }
}
