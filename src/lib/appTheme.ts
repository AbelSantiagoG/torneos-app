/** Tema claro/oscuro: una sola fuente de verdad + persistencia. */
export const APP_THEME_STORAGE_KEY = 'torneo-app-theme'

export type AppThemeMode = 'light' | 'dark'

export function readStoredTheme(): AppThemeMode {
  if (typeof localStorage === 'undefined') return 'light'
  return localStorage.getItem(APP_THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

export function writeStoredTheme(mode: AppThemeMode): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(APP_THEME_STORAGE_KEY, mode)
}
