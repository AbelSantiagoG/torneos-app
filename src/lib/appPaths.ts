/** Path segments for the app shell (React Router). Legacy keys match previous onNavigate IDs. */
export const APP_PATHS = {
  dashboard: '/dashboard',
  categorias: '/categorias',
  equipos: '/equipos',
  carnets: '/carnets',
  partidos: '/partidos',
  actas: '/actas',
  acta: '/acta',
  estadisticas: '/estadisticas',
  adminTorneos: '/admin-torneos',
  playoffs: '/playoffs',
  arbitrajes: '/arbitrajes',
  finanzas: '/finanzas',
  reportes: '/reportes',
  configuracion: '/configuracion',
} as const

export type AppPathKey = keyof typeof APP_PATHS

export function pathForLegacyPage(page: string): string {
  if (page in APP_PATHS) {
    return APP_PATHS[page as AppPathKey]
  }
  return APP_PATHS.dashboard
}
