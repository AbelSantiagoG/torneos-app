/** Edad aproximada en años cumplidos según año de nacimiento (referencia: año calendario actual). */
export function edadDesdeAnioNacimiento(anioNacimiento: number, referenciaAnio = new Date().getFullYear()): number {
  return referenciaAnio - anioNacimiento
}

export function validarEdadCategoria(
  anioNacimiento: number,
  edadMin: number | null,
  edadMax: number | null,
  referenciaAnio = new Date().getFullYear(),
): string | null {
  const edad = edadDesdeAnioNacimiento(anioNacimiento, referenciaAnio)
  if (edadMax != null && edad > edadMax) {
    return 'La edad del jugador no corresponde a la categoría seleccionada.'
  }
  if (edadMin != null && edad < edadMin) {
    return 'La edad del jugador no corresponde a la categoría seleccionada.'
  }
  return null
}
