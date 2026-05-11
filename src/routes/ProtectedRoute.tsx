import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { Spinner } from '@/components/ui/spinner'

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="size-10 text-primary" />
    </div>
  )
}

/** Rutas protegidas: requiere sesión de Supabase. */
export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return <AuthLoading />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/** Rutas solo para invitados (login): redirige al dashboard si ya hay sesión. */
export function GuestRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return <AuthLoading />
  }

  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export function RootRedirect() {
  const { session, loading } = useAuth()

  if (loading) {
    return <AuthLoading />
  }

  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}
