import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { APP_THEME_STORAGE_KEY, readStoredTheme, writeStoredTheme, type AppThemeMode } from '@/lib/appTheme'

type ThemeContextValue = {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkModeState] = useState(() => readStoredTheme() === 'dark')

  useEffect(() => {
    return listenThemeStorage(() => setDarkModeState(readStoredTheme() === 'dark'))
  }, [])

  const setDarkMode = useCallback((value: boolean) => {
    setDarkModeState(value)
    const mode: AppThemeMode = value ? 'dark' : 'light'
    writeStoredTheme(mode)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
  }, [darkMode, setDarkMode])

  const value = useMemo(
    () => ({
      darkMode,
      setDarkMode,
      toggleDarkMode,
    }),
    [darkMode, setDarkMode, toggleDarkMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useAppTheme debe usarse dentro de ThemeProvider')
  }
  return ctx
}

export function listenThemeStorage(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === APP_THEME_STORAGE_KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
