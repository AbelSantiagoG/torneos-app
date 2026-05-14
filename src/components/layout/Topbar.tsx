import { useState } from 'react'
import { Bell, Settings, User, Sun, Moon, Search, LogOut, Plus } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { APP_PATHS } from '@/lib/appPaths'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { CrearTorneoDialog } from '@/components/torneos/CrearTorneoDialog'
import { useAppTheme } from '@/features/theme/ThemeProvider'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'

interface TopbarProps {
  onToggleDarkMode: () => void
}

function initialsFromEmail(email: string | undefined): string {
  if (!email) return '??'
  const local = email.split('@')[0] ?? email
  const parts = local.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) return (parts[0]![0] + parts[1]![0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export function Topbar({ onToggleDarkMode }: TopbarProps) {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { data: torneo, isLoading: torneoLoading, torneos, selectedTorneoId, setTorneoId } = useTorneoActivo()
  const { darkMode } = useAppTheme()
  const [crearTorneoOpen, setCrearTorneoOpen] = useState(false)

  const nombreTorneo = torneo?.nombre ?? (torneoLoading ? 'Cargando…' : 'Sin torneo')
  const organizacion = torneo?.organizacion ?? ''
  const logoSrc = resolveDisplayImageUrl(
    torneo?.logo_public_id,
    torneo?.logo_url,
    displayImagePresets.torneoLogo(),
  )

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
    <>
      <CrearTorneoDialog open={crearTorneoOpen} onOpenChange={setCrearTorneoOpen} />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-6">
          <div className="flex min-w-0 shrink items-center gap-3">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="h-10 w-10 shrink-0 rounded-lg border object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                {nombreTorneo.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-foreground">{nombreTorneo}</h1>
              <p className="truncate text-xs text-muted-foreground">{organizacion || '—'}</p>
            </div>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <Select
              value={selectedTorneoId ?? ''}
              onValueChange={(v) => setTorneoId(v)}
              disabled={torneoLoading || torneos.length === 0}
            >
              <SelectTrigger className="max-w-[220px] lg:max-w-xs">
                <SelectValue placeholder={torneos.length === 0 ? 'Sin torneos' : 'Torneo activo'} />
              </SelectTrigger>
              <SelectContent>
                {torneos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1" onClick={() => setCrearTorneoOpen(true)}>
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          </div>

          <div className="relative hidden lg:flex">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar equipos, jugadores…" className="w-56 bg-muted/50 pl-9 xl:w-72" />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-muted-foreground">
                No hay alertas por ahora.
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
    </>
  )
}
