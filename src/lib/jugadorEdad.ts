/** Edad aproximada en años cumplidos según año de nacimiento (referencia: año calendario actual). */
export function edadDesdeAnioNacimiento(anioNacimiento: number, referenciaAnio = new Date().getFullYear()): number {
  return referenciaAnio - anioNacimiento
}

/**
 * Valida que la edad del jugador no supere la edad máxima de la categoría (ej. Sub-5 → edad_max 5).
 * No se usa edad_min en la app.
 */
export function validarEdadCategoria(
  anioNacimiento: number,
  edadMax: number | null | undefined,
  referenciaAnio = new Date().getFullYear(),
): string | null {
  const edad = edadDesdeAnioNacimiento(anioNacimiento, referenciaAnio)
  if (edadMax != null && edad > edadMax) {
    return 'La edad del jugador no corresponde a la categoría.'
  }
  return null
}
