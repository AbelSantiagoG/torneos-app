import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={cn('min-h-screen bg-background', darkMode && 'dark')}>
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />

      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-16' : 'ml-64',
        )}
      >
        <Topbar darkMode={darkMode} onToggleDarkMode={() => setDarkMode((v) => !v)} />

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
