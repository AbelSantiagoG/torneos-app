import { useEffect } from 'react'
import {
  Layers,
  Users,
  UserCheck,
  Calendar,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/common/StatCard'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency, formatShortDate } from '@/lib/utils'
import { useDashboard } from '@/features/dashboard/useDashboard'
import { isProgramadoEstado } from '@/features/partidos/partidosUi'

interface DashboardPageProps {
  onNavigate: (page: string) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { torneo, torneoLoading, torneoError, data, isLoading, isError, error } = useDashboard()

  useEffect(() => {
    if (torneoError) {
      toast.error(torneoError instanceof Error ? torneoError.message : 'No se pudo cargar el torneo')
    }
  }, [torneoError])

  useEffect(() => {
    if (isError && error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar el dashboard')
    }
  }, [isError, error])

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  if (!torneo) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Resumen del torneo activo" />
        <EmptyState
          icon={Trophy}
          title="Sin torneo activo"
          description="No hay un torneo activo en Supabase. Crea o activa un torneo para ver el dashboard."
        />
      </div>
    )
  }

  const counts = data?.counts
  const resumen = data?.resumen
  const categorias = data?.categorias ?? []
  const proximos = data?.proximos ?? []
  const ultimos = data?.ultimos ?? []
  const conflicts = data?.conflicts

  const categoriasActivas = counts?.categoriasActivas ?? 0
  const categoriasTotal = counts?.categoriasTotal ?? 0
  const totalEquipos = counts?.equipos ?? 0
  const totalJugadores = counts?.jugadores ?? 0
  const partidosProgramados = counts?.partidosProgramados ?? 0
  const partidosJugados = counts?.partidosJugados ?? 0
  const totalPartidos = counts?.partidosTotal ?? 0

  const avanceTorneo =
    totalPartidos > 0 ? Math.round((partidosJugados / totalPartidos) * 100) : 0

  const resumenFin = resumen ?? {
    ingresosEsperados: 0,
    ingresosCobrados: 0,
    carteraPendiente: 0,
    totalEgresos: 0,
    resultado: 0,
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Resumen general del torneo ${torneo.nombre}`}
        actions={
          <Button onClick={() => onNavigate('partidos')}>
            <Calendar className="mr-2 h-4 w-4" />
            Ver Fixture
          </Button>
        }
      />

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {conflicts?.hasConflicts && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
              <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Conflicto de cancha u horario</p>
              <p className="text-sm text-muted-foreground">
                {conflicts.detalle ?? 'Hay partidos con la misma hora y cancha el mismo día.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('partidos')}>
              Revisar fixture
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Categorías Activas"
          value={categoriasActivas}
          subtitle={`de ${categoriasTotal} totales`}
          icon={Layers}
        />
        <StatCard title="Equipos Inscritos" value={totalEquipos} icon={Users} />
        <StatCard title="Jugadores" value={totalJugadores} icon={UserCheck} />
        <StatCard title="Partidos Programados" value={partidosProgramados} icon={Calendar} />
        <StatCard title="Partidos Jugados" value={partidosJugados} icon={CalendarCheck} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Avance del Torneo</span>
              <span className="text-2xl font-bold text-primary">{avanceTorneo}%</span>
            </div>
            <Progress value={avanceTorneo} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {partidosJugados} de {totalPartidos} partidos
            </p>
          </CardContent>
        </Card>

        <StatCard
          title="Ingresos Esperados"
          value={formatCurrency(resumenFin.ingresosEsperados)}
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Cartera Pendiente"
          value={formatCurrency(resumenFin.carteraPendiente)}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Resultado"
          value={formatCurrency(resumenFin.resultado)}
          icon={TrendingUp}
          variant={resumenFin.resultado >= 0 ? 'success' : 'danger'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado por Categoría</CardTitle>
          <CardDescription>Progreso según equipos y partidos en Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          {categorias.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Sin categorías"
              description="Crea categorías para organizar equipos y partidos."
              action={
                <Button onClick={() => onNavigate('categorias')}>Ir a categorías</Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {categorias.map((categoria) => {
                const progressCat =
                  categoria.partidosTotal > 0
                    ? Math.round((categoria.partidosJugados / categoria.partidosTotal) * 100)
                    : 0

                return (
                  <Card
                    key={categoria.categoriaId}
                    className="cursor-pointer border transition-shadow hover:shadow-md"
                    onClick={() => onNavigate('categorias')}
                  >
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoria.color }} />
                        <span className="text-sm font-semibold">{categoria.nombre}</span>
                        {!categoria.activa && (
                          <Badge variant="secondary" className="h-4 text-[10px]">
                            Inactiva
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{categoria.equipos} equipos</span>
                          <span>{progressCat}%</span>
                        </div>
                        <Progress value={progressCat} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {categoria.partidosJugados}/{categoria.partidosTotal} partidos
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Próximos Partidos</CardTitle>
              <CardDescription>Partidos no jugados según programación</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('partidos')}>
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {proximos.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin partidos programados"
                description="Cuando existan partidos pendientes en el fixture, aparecerán aquí."
                action={<Button onClick={() => onNavigate('partidos')}>Ir al fixture</Button>}
              />
            ) : (
              <div className="space-y-3">
                {proximos.map((partido) => (
                  <div
                    key={partido.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-[50px] text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {partido.fecha ? formatShortDate(partido.fecha) : '—'}
                        </p>
                        <p className="text-sm font-bold">{partido.hora || '—'}</p>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          {partido.equipoLocalNombre} vs {partido.equipoVisitanteNombre}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="h-4 text-[10px]"
                            style={{ borderColor: partido.categoriaColor, color: partido.categoriaColor }}
                          >
                            {partido.categoriaNombre || 'Categoría'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{partido.cancha || 'Cancha por definir'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={isProgramadoEstado(partido.estado) ? 'default' : 'secondary'}>
                      {isProgramadoEstado(partido.estado) ? 'Programado' : partido.estado || 'Pendiente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Últimos Resultados</CardTitle>
              <CardDescription>Partidos marcados como jugados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('estadisticas')}>
              Ver tabla
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {ultimos.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="Sin resultados recientes"
                description="Cuando se registren partidos jugados, verás aquí los últimos marcadores."
              />
            ) : (
              <div className="space-y-3">
                {ultimos.map((partido) => (
                  <div
                    key={partido.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-[50px] text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                          {partido.fecha ? formatShortDate(partido.fecha) : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-28 truncate text-right text-sm font-medium">
                          {partido.equipoLocalNombre}
                        </span>
                        <div className="flex min-w-[60px] items-center justify-center rounded bg-secondary px-2 py-1 text-secondary-foreground">
                          <span className="font-bold">
                            {partido.golesLocal != null ? partido.golesLocal : '—'}
                          </span>
                          <span className="mx-1 text-muted-foreground">-</span>
                          <span className="font-bold">
                            {partido.golesVisitante != null ? partido.golesVisitante : '—'}
                          </span>
                        </div>
                        <span className="w-28 truncate text-sm font-medium">{partido.equipoVisitanteNombre}</span>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-4 text-[10px]"
                      style={{ borderColor: partido.categoriaColor, color: partido.categoriaColor }}
                    >
                      {partido.categoriaNombre}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Resumen Financiero</CardTitle>
            <CardDescription>Desde la vista vw_resumen_financiero (o ceros si no hay datos)</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('finanzas')}>
            Ver detalle
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Ingresos Esperados</p>
              <p className="text-lg font-bold">{formatCurrency(resumenFin.ingresosEsperados)}</p>
            </div>
            <div className="rounded-lg bg-success/10 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Ingresos Cobrados</p>
              <p className="text-lg font-bold text-success">{formatCurrency(resumenFin.ingresosCobrados)}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Cartera Pendiente</p>
              <p className="text-lg font-bold text-warning-foreground">{formatCurrency(resumenFin.carteraPendiente)}</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Egresos</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(resumenFin.totalEgresos)}</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-4">
              <p className="mb-1 text-xs text-muted-foreground">Resultado</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(resumenFin.resultado)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
