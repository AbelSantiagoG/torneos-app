/** Helpers for flexible view/table rows (column names may vary). */

export function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

export function pickStr(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (v != null && String(v).trim() !== '') return String(v)
  }
  return ''
}

export function pickNum(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = row[k]
    if (v == null || v === '') continue
    const n = Number(v)
    if (!Number.isNaN(n)) return n
  }
  return 0
}

export function pickBool(row: Record<string, unknown>, key: string): boolean {
  const v = row[key]
  return v === true || v === 'true' || v === 1
}

export function asRow(r: unknown): Record<string, unknown> {
  return r && typeof r === 'object' ? (r as Record<string, unknown>) : {}
}
