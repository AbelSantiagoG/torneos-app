import { useState, type FormEvent } from 'react'
import { AuthError } from '@supabase/supabase-js'
import { Award, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/AuthProvider'

function friendlyLoginError(err: unknown): string {
  if (err instanceof AuthError) {
    const m = err.message.toLowerCase()
    if (m.includes('invalid login') || m.includes('invalid_credentials')) {
      return 'Correo o contraseña incorrectos.'
    }
    if (m.includes('email not confirmed')) {
      return 'Debes confirmar tu correo antes de iniciar sesión.'
    }
    return err.message
  }
  const isFailedFetch =
    (err instanceof TypeError && err.message === 'Failed to fetch') ||
    (err instanceof Error && err.message === 'Failed to fetch')
  if (isFailedFetch) {
    return 'No se pudo conectar con Supabase. Si la consola muestra ERR_NAME_NOT_RESOLVED, el subdominio de VITE_SUPABASE_URL no existe: en Supabase abre Settings → API y copia otra vez "Project URL" (solo https://xxxx.supabase.co, sin /rest/v1). Comprueba también la anon key y ejecuta la app con npm run dev (no abras el HTML como archivo).'
  }
  if (err instanceof Error) return err.message
  return 'No se pudo iniciar sesión'
}

export function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Ingresa correo y contraseña')
      return
    }
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      toast.success('Sesión iniciada')
    } catch (err) {
      toast.error(friendlyLoginError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-6 sm:py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[linear-gradient(145deg,oklch(0.22_0.08_250)_0%,oklch(0.28_0.12_155)_45%,oklch(0.2_0.06_250)_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
          }}
        />
        <div className="absolute left-1/2 top-1/2 h-[min(88vh,820px)] w-[min(92vw,1100px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 opacity-40" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-white/10" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <Card className="border border-white/10 bg-card/95 shadow-[0_24px_80px_-16px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-card/85 sm:rounded-2xl">
          <CardHeader className="space-y-6 pb-2 pt-10 text-center sm:px-10 sm:pt-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/25 sm:h-16 sm:w-16">
              <Award className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="space-y-3 px-2">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Panel de competición
              </p>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                Gestión de torneos
              </h1>
              <CardDescription className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground">
                Ingresa con tu correo para administrar categorías, equipos y configuración en un solo lugar.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-5 px-6 pb-2 sm:px-10">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="admin@torneo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-10"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 pr-11"
                    disabled={submitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={submitting}
                  />
                  <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">
                    Recordarme
                  </Label>
                </div>
                <Button type="button" variant="link" className="h-auto p-0 text-sm font-medium text-primary">
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-5 px-6 pb-10 pt-2 sm:px-10 sm:pb-12">
              <Button type="submit" size="lg" className="h-12 w-full text-base font-semibold shadow-md shadow-primary/25 transition hover:shadow-lg hover:shadow-primary/30" disabled={submitting}>
                {submitting ? (
                  <>
                    <Spinner className="mr-2 size-5" />
                    Ingresando…
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Sistema privado. El acceso no autorizado está prohibido.
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-8 text-center text-xs text-white/45">Sistema de Gestión de Torneos · Liga Infantil de Fútbol</p>
      </div>
    </div>
  )
}
