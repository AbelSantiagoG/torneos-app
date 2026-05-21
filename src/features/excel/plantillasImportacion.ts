/** Texto de ayuda para importacion masiva (.xlsx / .csv). Primera fila = encabezados. */

export const PLANTILLA_EQUIPOS_CSV = `nombre,sigla,color,observaciones,logo_url
Equipo Ejemplo,EEJ,#dc2626,Opcional,https://ejemplo.com/logo.png
`

export const PLANTILLA_JUGADORES_CSV = `nombre_completo,documento,fecha_nacimiento,foto_url,observaciones
Tomás Pérez,109876544,2014-01-10,,
Emilio Sánchez,109876545,10/01/2014,,
`

export const DESCRIPCION_IMPORT_EQUIPOS = [
  'Columnas admitidas (primera fila): nombre, sigla, color, observaciones, logo_url.',
  'La categoria se toma de la categoria seleccionada en pantalla (no va en el archivo).',
  'color: codigo hex, por ejemplo #22c55e.',
  'logo_url: opcional; URL publica de imagen si ya esta hospedada (tambien puedes subir logo desde el formulario).',
].join(' ')

export const DESCRIPCION_IMPORT_JUGADORES = [
  'Columnas: nombre_completo, documento, fecha_nacimiento, foto_url (opcional), observaciones (opcional).',
  'El equipo se toma del equipo cuyo listado de jugadores tienes abierto.',
  'fecha_nacimiento acepta YYYY-MM-DD, YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY y fechas nativas de Excel.',
  'Se valida documento duplicado y edad segun la categoria del equipo.',
].join(' ')
