/**
 * Interpreta fechas desde Excel/CSV (texto, Date, serial de Excel).
 * Devuelve YYYY-MM-DD o null si no se puede interpretar.
 *
 * Regla: si los 4 dígitos del año van al inicio → año-mes-día; si van al final → día-mes-año.
 * No usar Date.parse() ni toISOString() para cadenas ambiguas (evita desfases de zona horaria).
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
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

/** Fecha de celda Excel: usar componentes locales, no toISOString (evita +045830-01 en Postgres). */
function fromJsDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null
  return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function parseDateFlexible(value: unknown): string | null {
  if (value == null || value === '') return null

  if (value instanceof Date) {
    return fromJsDate(value)
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

  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s)
    if (Number.isFinite(n) && Number.isInteger(n) && n > 20000 && n < 80000) {
      const fromSerial = fromExcelSerial(n)
      if (fromSerial) return fromSerial
    }
  }

  let m = s.match(ISO_YMD)
  if (m) {
    return toIso(Number(m[1]), Number(m[2]), Number(m[3]))
  }

  m = s.match(DMY_Y4)
  if (m) {
    return toIso(Number(m[3]), Number(m[2]), Number(m[1]))
  }

  return null
}
