import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { GuestRoute, ProtectedRoute, RootRedirect } from '@/routes/ProtectedRoute'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { CategoriasPage } from '@/pages/CategoriasPage'
import { EquiposPage } from '@/pages/EquiposPage'
import { CarnetsPage } from '@/pages/CarnetsPage'
import { PartidosPage } from '@/pages/PartidosPage'
import { ActaPartidoPage } from '@/pages/ActaPartidoPage'
import { EstadisticasPage } from '@/pages/EstadisticasPage'
import { PlayoffsPage } from '@/pages/PlayoffsPage'
import { ArbitrajesPage } from '@/pages/ArbitrajesPage'
import { FinanzasPage } from '@/pages/FinanzasPage'
import { ReportesPage } from '@/pages/ReportesPage'
import { ConfiguracionPage } from '@/pages/ConfiguracionPage'
import { pathForLegacyPage } from '@/lib/appPaths'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function DashboardRoute() {
  const navigate = useNavigate()
  return <DashboardPage onNavigate={(p) => navigate(pathForLegacyPage(p))} />
}

function PartidosRoute() {
  const navigate = useNavigate()
  return <PartidosPage onOpenActa={() => navigate('/acta')} />
}

function ActaRoute() {
  const navigate = useNavigate()
  return <ActaPartidoPage onBack={() => navigate('/partidos')} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/equipos" element={<EquiposPage />} />
          <Route path="/carnets" element={<CarnetsPage />} />
          <Route path="/partidos" element={<PartidosRoute />} />
          <Route path="/acta" element={<ActaRoute />} />
          <Route path="/estadisticas" element={<EstadisticasPage />} />
          <Route path="/playoffs" element={<PlayoffsPage />} />
          <Route path="/arbitrajes" element={<ArbitrajesPage />} />
          <Route path="/finanzas" element={<FinanzasPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster richColors closeButton position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
