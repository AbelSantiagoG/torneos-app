import { Bell, Settings, User, Sun, Moon, Search, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { APP_PATHS } from '@/lib/appPaths'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'

interface TopbarProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

function initialsFromEmail(email: string | undefined): string {
  if (!email) return '??'
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function Topbar({ darkMode, onToggleDarkMode }: TopbarProps) {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()

  const nombreTorneo = torneo?.nombre ?? (torneoLoading ? 'Cargando…' : 'Sin torneo activo')
  const organizacion = torneo?.organizacion ?? ''

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Sesión cerrada')
      navigate('/login', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cerrar sesión')
    }
  }

  const displayName = user?.user_metadata?.full_name as string | undefined
  const label = displayName || user?.email || 'Usuario'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{nombreTorneo}</h1>
          <p className="text-xs text-muted-foreground">{organizacion || '—'}</p>
        </div>

        <div className="relative hidden md:flex">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar equipos, jugadores…" className="w-72 bg-muted/50 pl-9" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleDarkMode}
          className="text-muted-foreground hover:text-foreground"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center bg-destructive p-0 text-[10px] text-destructive-foreground">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Conflicto de cancha detectado</span>
              <span className="text-xs text-muted-foreground">2 partidos programados a las 10:00 en Cancha 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Inscripción pendiente</span>
              <span className="text-xs text-muted-foreground">Real Santander aún no completa el pago</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Partido por registrar</span>
              <span className="text-xs text-muted-foreground">5 partidos jugados sin acta registrada</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(APP_PATHS.configuracion)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {initialsFromEmail(user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">{label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              {user?.email ?? 'Perfil'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(APP_PATHS.configuracion)}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
