import * as XLSX from 'xlsx'

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Plantilla equipos: nombre, sigla, color, observaciones, logo_url (sin categoría). */
export function downloadPlantillaEquiposXlsx() {
  const rows = [
    ['nombre', 'sigla', 'color', 'observaciones', 'logo_url'],
    ['Atlético Junior', 'AJ', '#22c55e', 'Equipo invitado', ''],
    ['Deportivo Águilas', 'DA', '#ef4444', '', ''],
    ['FC Tigres', 'TI', '#f97316', '', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Equipos')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'plantilla-equipos.xlsx',
  )
}

/** Plantilla jugadores: nombre_completo, documento, anio_nacimiento, fecha_nacimiento, foto_url, observaciones. */
export function downloadPlantillaJugadoresXlsx() {
  const rows = [
    ['nombre_completo', 'documento', 'anio_nacimiento', 'fecha_nacimiento', 'foto_url', 'observaciones'],
    ['Tomás Pérez', '109876544', 2017, '2017-04-15', '', ''],
    ['Emilio Sánchez', '109876545', 2017, '2017-06-22', '', ''],
    ['Gabriel Ruiz', '109876546', 2016, '2016-11-03', '', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Jugadores')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'plantilla-jugadores.xlsx',
  )
}
