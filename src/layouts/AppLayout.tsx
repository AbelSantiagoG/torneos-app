import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { useAppTheme } from '@/features/theme/ThemeProvider'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { darkMode, toggleDarkMode } = useAppTheme()

  return (
    <div className={cn('min-h-screen bg-background', darkMode && 'dark')}>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />

      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
        )}
      >
        <Topbar onToggleDarkMode={toggleDarkMode} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
