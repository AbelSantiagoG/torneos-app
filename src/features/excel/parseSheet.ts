import * as XLSX from 'xlsx'

export async function parseSpreadsheetToRows(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const name = wb.SheetNames[0]
  if (!name) return []
  const sheet = wb.Sheets[name]
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

/** Busca valor por claves posibles (insensible a mayúsculas en el encabezado del Excel). */
export function pickCell(row: Record<string, unknown>, ...keys: string[]): string {
  const normalized = new Map<string, unknown>()
  for (const k of Object.keys(row)) {
    normalized.set(k.trim().toLowerCase(), row[k])
  }
  for (const key of keys) {
    const v = normalized.get(key.trim().toLowerCase())
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}
