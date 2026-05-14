import { getCategoriaById } from '@/features/categorias/categoriasService'
import { getEquipoById } from '@/features/equipos/equiposService'
import { createJugadorConEquipo } from '@/features/jugadores/jugadoresService'
import { pickCell } from '@/features/excel/parseSheet'
import { translateUserError } from '@/lib/errorMessages'
import { validarEdadCategoria } from '@/lib/jugadorEdad'
import { parseDateFlexible } from '@/lib/parseDateFlexible'

export type ImportJugadoresResult = {
  creados: number
  omitidos: string[]
  errores: { fila: number; mensaje: string }[]
}

export async function importJugadoresFromRows(
  rows: Record<string, unknown>[],
  equipoId: string,
): Promise<ImportJugadoresResult> {
  const omitidos: string[] = []
  const errores: { fila: number; mensaje: string }[] = []
  let creados = 0

  const equipo = await getEquipoById(equipoId)
  if (!equipo) {
    return { creados: 0, omitidos: [], errores: [{ fila: 0, mensaje: 'Equipo no encontrado.' }] }
  }

  const categoria = await getCategoriaById(equipo.categoria_id)
  const edadMax = categoria?.edad_max ?? null

  const docsEnArchivo = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const fila = i + 2
    const nombreCompleto = pickCell(row, 'nombre_completo', 'nombre', 'jugador', 'full_name', 'nombres')
    const documento = pickCell(row, 'documento', 'doc', 'cedula', 'dni', 'id')
    const anioStr = pickCell(row, 'anio_nacimiento', 'año_nacimiento', 'ano_nacimiento', 'año', 'anio', 'year')
    const fechaNacRaw = pickCell(row, 'fecha_nacimiento', 'fecha nacimiento', 'birthdate')
    const fechaIso = parseDateFlexible(fechaNacRaw)
    if (fechaNacRaw.trim() && !fechaIso) {
      errores.push({ fila, mensaje: 'fecha_nacimiento no reconocida. Usa YYYY-MM-DD o DD/MM/YYYY.' })
      continue
    }
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
    const anio = Number(anioStr)
    if (!anioStr || Number.isNaN(anio) || anio < 1900 || anio > new Date().getFullYear()) {
      errores.push({ fila, mensaje: 'Año de nacimiento inválido.' })
      continue
    }

    const docKey = documento.toLowerCase()
    if (docsEnArchivo.has(docKey)) {
      omitidos.push(`${documento} (duplicado en el archivo)`)
      continue
    }
    docsEnArchivo.add(docKey)

    const edadMsg = validarEdadCategoria(anio, edadMax)
    if (edadMsg) {
      errores.push({ fila, mensaje: edadMsg })
      continue
    }

    try {
      await createJugadorConEquipo(
        {
          nombre_completo: nombreCompleto,
          documento,
          anio_nacimiento: anio,
          fecha_nacimiento: fechaIso,
          observaciones: observaciones || null,
          foto_url: fotoUrl?.trim() || null,
          foto_public_id: null,
        },
        equipoId,
      )
      creados++
    } catch (e) {
      const msg = translateUserError(e, 'jugador')
      if (msg.includes('Ya existe un jugador con ese documento')) {
        omitidos.push(`${documento} (${nombreCompleto})`)
      } else {
        errores.push({ fila, mensaje: msg })
      }
    }
  }

  return { creados, omitidos, errores }
}
