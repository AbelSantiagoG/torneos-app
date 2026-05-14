import { createEquipo, existeEquipoNombreEnCategoria } from '@/features/equipos/equiposService'
import { pickCell } from '@/features/excel/parseSheet'
import { translateUserError } from '@/lib/errorMessages'

export type ImportEquiposResult = {
  creados: number
  omitidos: string[]
  errores: { fila: number; mensaje: string }[]
}

const DEFAULT_EQUIPO_COLOR = '#64748b'

function resolveColor(raw: string): { ok: true; hex: string } | { ok: false; mensaje: string } {
  const t = raw.trim()
  if (!t) return { ok: true, hex: DEFAULT_EQUIPO_COLOR }
  const hex = t.startsWith('#') ? t : `#${t.replace(/^#/, '')}`
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return { ok: false, mensaje: 'El color debe ser hexadecimal de 6 dígitos, ejemplo #22c55e.' }
  }
  return { ok: true, hex }
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
    const colorRaw = pickCell(row, 'color', 'colour')
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
    const colorRes = resolveColor(colorRaw)
    if (!colorRes.ok) {
      errores.push({ fila, mensaje: colorRes.mensaje })
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
        color: colorRes.hex,
        observaciones: observaciones || null,
        logo_url: logoUrl?.trim() || null,
        logo_public_id: null,
      })
      creados++
    } catch (e) {
      errores.push({ fila, mensaje: translateUserError(e, 'equipo') })
    }
  }

  return { creados, omitidos, errores }
}
