import * as XLSX from 'xlsx'

export async function parseSpreadsheetToRows(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const name = wb.SheetNames[0]
  if (!name) return []
  const sheet = wb.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

/** Busca valor crudo por claves posibles (insensible a mayusculas en el encabezado del Excel). */
export function pickRawCell(row: Record<string, unknown>, ...keys: string[]): unknown {
  const normalized = new Map<string, unknown>()
  for (const k of Object.keys(row)) {
    normalized.set(k.trim().toLowerCase(), row[k])
  }
  for (const key of keys) {
    const v = normalized.get(key.trim().toLowerCase())
    if (v != null && String(v).trim() !== '') return v
  }
  return ''
}

/** Busca valor por claves posibles (insensible a mayusculas en el encabezado del Excel). */
export function pickCell(row: Record<string, unknown>, ...keys: string[]): string {
  const v = pickRawCell(row, ...keys)
  if (v == null || String(v).trim() === '') return ''
  if (v instanceof Date) return v.toLocaleDateString('es-CO')
  return String(v).trim()
}

export function hasCellValue(row: Record<string, unknown>, ...keys: string[]): boolean {
  const v = pickRawCell(row, ...keys)
  if (v == null) return false
  if (v instanceof Date) return !Number.isNaN(v.getTime())
  return String(v).trim() !== ''
}
