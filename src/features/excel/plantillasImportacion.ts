/** Texto de ayuda para importación masiva (.xlsx / .csv). Primera fila = encabezados. */

export const PLANTILLA_EQUIPOS_CSV = `nombre,sigla,color,observaciones,logo_url
Equipo Ejemplo,EEJ,#dc2626,Opcional,https://ejemplo.com/logo.png
`

export const PLANTILLA_JUGADORES_CSV = `nombre_completo,documento,anio_nacimiento,fecha_nacimiento,foto_url,observaciones
Juan Pérez García,1234567890,2018,2018-05-10,,Sin observaciones
`

export const DESCRIPCION_IMPORT_EQUIPOS = [
  'Columnas admitidas (primera fila): nombre, sigla, color, observaciones, logo_url.',
  'La categoría se toma de la categoría seleccionada en pantalla (no va en el archivo).',
  'color: código hex, por ejemplo #22c55e.',
  'logo_url: opcional; URL pública de imagen si ya está hospedada (también puedes subir logo desde el formulario).',
].join(' ')

export const DESCRIPCION_IMPORT_JUGADORES = [
  'Columnas: nombre_completo, documento, anio_nacimiento, fecha_nacimiento (opcional), foto_url (opcional), observaciones (opcional).',
  'El equipo se toma del equipo cuyo listado de jugadores tienes abierto.',
  'Se valida documento duplicado y edad según la categoría del equipo.',
].join(' ')
