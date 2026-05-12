import { createEquipo, existeEquipoNombreEnCategoria } from '@/features/equipos/equiposService'
import { pickCell } from '@/features/excel/parseSheet'
import { toUserError } from '@/lib/supabaseErrors'

export type ImportEquiposResult = {
  creados: number
  omitidos: string[]
  errores: { fila: number; mensaje: string }[]
}

function normalizeColor(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (t.startsWith('#')) return t.length >= 4 ? t : ''
  return `#${t.replace(/^#/, '')}`
}

export async function importEquiposFromRows(
  rows: Record<string, unknown>[],
  opts: { torneoId: string; categoriaId: string },
): Promise<ImportEquiposResult> {
  const omitidos: string[] = []
  const errores: { fila: number; mensaje: string }[] = []
  let creados = 0
  const vistos = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const fila = i + 2
    const nombre = pickCell(row, 'nombre', 'name', 'equipo', 'nombre_equipo')
    const sigla = pickCell(row, 'sigla', 'abbr', 'iniciales')
    let color = normalizeColor(pickCell(row, 'color', 'colour'))
    const observaciones = pickCell(row, 'observaciones', 'notas', 'notes', 'comentarios')
    const logoUrl = pickCell(row, 'logo_url', 'logo', 'url_logo', 'imagen')

    if (!nombre) {
      errores.push({ fila, mensaje: 'Falta el nombre del equipo.' })
      continue
    }
    if (!sigla) {
      errores.push({ fila, mensaje: 'Falta la sigla.' })
      continue
    }
    if (!color) {
      errores.push({ fila, mensaje: 'Falta el color (ej: #dc2626).' })
      continue
    }

    const key = nombre.toLowerCase()
    if (vistos.has(key)) {
      omitidos.push(`${nombre} (duplicado en el archivo)`)
      continue
    }
    vistos.add(key)

    try {
      const existe = await existeEquipoNombreEnCategoria(opts.categoriaId, nombre)
      if (existe) {
        omitidos.push(`${nombre} (ya existe en la categoría)`)
        continue
      }
      await createEquipo(opts.torneoId, opts.categoriaId, {
        nombre,
        sigla,
        color,
        observaciones: observaciones || null,
        logo_url: logoUrl?.trim() || null,
        logo_public_id: null,
      })
      creados++
    } catch (e) {
      errores.push({ fila, mensaje: toUserError(e, 'equipo').message })
    }
  }

  return { creados, omitidos, errores }
}
