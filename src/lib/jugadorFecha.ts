import { parseDateFlexible } from '@/lib/parseDateFlexible'

/** Deriva año de nacimiento desde fecha ISO o numero. */
export function anioDesdeFechaNacimiento(fechaIso: string | null | undefined): number | null {
  if (!fechaIso?.trim()) return null
  const y = Number(fechaIso.slice(0, 4))
  return Number.isFinite(y) && y >= 1900 && y <= 2100 ? y : null
}

export function resolverAnioNacimiento(opts: {
  fecha_nacimiento?: string | null
  anio_nacimiento?: number | null
}): { anio: number; fecha: string | null } {
  const fechaInput = opts.fecha_nacimiento?.trim() || ''
  const fecha = parseDateFlexible(fechaInput)
  if (fechaInput && !fecha) {
    throw new Error('La fecha del jugador no tiene un formato válido.')
  }
  if (fecha) {
    const anio = anioDesdeFechaNacimiento(fecha)
    if (anio == null) throw new Error('La fecha del jugador no tiene un formato válido.')
    return { anio, fecha }
  }
  const anio = opts.anio_nacimiento
  if (anio == null || Number.isNaN(anio) || anio < 1900 || anio > new Date().getFullYear()) {
    throw new Error('La fecha de nacimiento es obligatoria.')
  }
  return { anio, fecha: null }
}

export function edadDesdeAnio(anio: number, ref = new Date()): number {
  return ref.getFullYear() - anio
}

export function onFechaNacimientoChange(fechaInput: string): { fecha: string; anio: string } {
  const iso = parseDateFlexible(fechaInput)
  if (!iso) return { fecha: fechaInput, anio: '' }
  const anio = String(anioDesdeFechaNacimiento(iso) ?? '')
  return { fecha: iso, anio }
}
