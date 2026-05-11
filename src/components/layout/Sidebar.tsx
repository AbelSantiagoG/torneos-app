import { cn } from '@/lib/utils'
import { APP_PATHS } from '@/lib/appPaths'
import {
  LayoutDashboard,
  Users,
  Trophy,
  Calendar,
  FileText,
  BarChart3,
  Award,
  Gavel,
  DollarSign,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
}

const menuItems = [
  { path: APP_PATHS.dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { path: APP_PATHS.categorias, label: 'Categorías', icon: Layers },
  { path: APP_PATHS.equipos, label: 'Equipos y Jugadores', icon: Users },
  { path: APP_PATHS.carnets, label: 'Carnets', icon: CreditCard },
  { path: APP_PATHS.partidos, label: 'Partidos / Fixture', icon: Calendar },
  { path: APP_PATHS.acta, label: 'Acta de Partido', icon: FileText },
  { path: APP_PATHS.estadisticas, label: 'Estadísticas', icon: BarChart3 },
  { path: APP_PATHS.playoffs, label: 'Playoffs', icon: Trophy },
  { path: APP_PATHS.arbitrajes, label: 'Arbitrajes', icon: Gavel },
  { path: APP_PATHS.finanzas, label: 'Finanzas', icon: DollarSign },
  { path: APP_PATHS.reportes, label: 'Reportes', icon: FileBarChart },
  { path: APP_PATHS.configuracion, label: 'Configuración', icon: Settings },
]

export function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()

  const tituloTorneo = torneo?.nombre ?? (torneoLoading ? '…' : 'Torneo')
  const subtituloOrg = torneo?.organizacion ?? ''

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-full flex-col">
          <div
            className={cn(
              'flex items-center border-b border-sidebar-border h-16 px-4',
              collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Award className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex flex-col">
                <span className="truncate text-sm font-semibold leading-tight">{tituloTorneo}</span>
                <span className="truncate text-xs text-sidebar-muted">{subtituloOrg || 'Competición'}</span>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 px-2 py-4">
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path

                if (collapsed) {
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-10 w-10 mx-auto',
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                          onClick={() => navigate(item.path)}
                        >
                          <Icon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-secondary text-secondary-foreground">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className={cn(
                      'justify-start gap-3 h-10',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm">{item.label}</span>
                  </Button>
                )
              })}
            </nav>
          </ScrollArea>

          <div className="border-t border-sidebar-border p-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onToggleCollapse}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
