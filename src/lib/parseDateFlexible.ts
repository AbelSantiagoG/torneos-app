/**
 * Interpreta fechas desde Excel/CSV (texto, Date, serial de Excel).
 * Devuelve YYYY-MM-DD o null si no se puede interpretar.
 *
 * Regla: si los 4 dígitos del año van al inicio → año-mes-día; si van al final → día-mes-año.
 */

const ISO_YMD = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/
const DMY_Y4 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toIso(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`
}

/** Días desde 1899-12-30 (convención habitual en serial Excel). */
function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return null
  const epoch = Date.UTC(1899, 11, 30)
  const ms = epoch + Math.round(serial) * 86400000
  const dt = new Date(ms)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

export function parseDateFlexible(value: unknown): string | null {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value
    if (Number.isInteger(n) && n > 20000 && n < 80000) {
      const fromSerial = fromExcelSerial(n)
      if (fromSerial) return fromSerial
    }
    if (Number.isInteger(n) && n >= 19000101 && n <= 21001231) {
      const y = Math.floor(n / 10000)
      const m = Math.floor((n % 10000) / 100)
      const d = n % 100
      return toIso(y, m, d)
    }
  }

  const s = String(value).trim()
  if (!s) return null

  let m = s.match(ISO_YMD)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const d = Number(m[3])
    return toIso(y, mo, d)
  }

  m = s.match(DMY_Y4)
  if (m) {
    const d = Number(m[1])
    const mo = Number(m[2])
    const y = Number(m[3])
    return toIso(y, mo, d)
  }

  const tryParse = Date.parse(s)
  if (!Number.isNaN(tryParse)) {
    const dt = new Date(tryParse)
    return dt.toISOString().slice(0, 10)
  }

  return null
}
