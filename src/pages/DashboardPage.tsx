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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatCard } from '@/components/common/StatCard'
import { PageHeader } from '@/components/common/PageHeader'
import { 
  categorias, 
  equipos, 
  jugadores, 
  partidos, 
  getEquipoById,
  calcularResumenFinanciero,
} from '@/data/mockData'
import { formatCurrency, formatShortDate } from '@/lib/utils'

interface DashboardPageProps {
  onNavigate: (page: string) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const resumenFinanciero = calcularResumenFinanciero()
  const categoriasActivas = categorias.filter(c => c.activa).length
  const totalEquipos = equipos.length
  const totalJugadores = jugadores.length
  const partidosProgramados = partidos.filter(p => p.estado === 'programado' || p.estado === 'pendiente').length
  const partidosJugados = partidos.filter(p => p.estado === 'jugado').length
  const totalPartidos = partidos.length
  const avanceTorneo = Math.round((partidosJugados / totalPartidos) * 100)

  const proximosPartidos = partidos
    .filter(p => p.estado === 'programado' || p.estado === 'pendiente')
    .slice(0, 4)

  const ultimosResultados = partidos
    .filter(p => p.estado === 'jugado')
    .slice(-4)
    .reverse()

  // Check for field conflicts (mock)
  const hasConflicts = true

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen general del torneo Copa Primavera 2024"
        actions={
          <Button onClick={() => onNavigate('partidos')}>
            <Calendar className="mr-2 h-4 w-4" />
            Ver Fixture
          </Button>
        }
      />

      {/* Alert for conflicts */}
      {hasConflicts && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
              <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Conflicto de cancha detectado</p>
              <p className="text-sm text-muted-foreground">
                2 partidos programados a las 10:00 del 29 Mar en Cancha 1
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('partidos')}>
              Resolver
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Categorías Activas"
          value={categoriasActivas}
          subtitle={`de ${categorias.length} totales`}
          icon={Layers}
        />
        <StatCard
          title="Equipos Inscritos"
          value={totalEquipos}
          icon={Users}
        />
        <StatCard
          title="Jugadores"
          value={totalJugadores}
          icon={UserCheck}
        />
        <StatCard
          title="Partidos Programados"
          value={partidosProgramados}
          icon={Calendar}
        />
        <StatCard
          title="Partidos Jugados"
          value={partidosJugados}
          icon={CalendarCheck}
        />
      </div>

      {/* Progress and Financial Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Avance del Torneo</span>
              <span className="text-2xl font-bold text-primary">{avanceTorneo}%</span>
            </div>
            <Progress value={avanceTorneo} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {partidosJugados} de {totalPartidos} partidos
            </p>
          </CardContent>
        </Card>

        <StatCard
          title="Ingresos Esperados"
          value={formatCurrency(resumenFinanciero.ingresosEsperados)}
          icon={DollarSign}
          variant="info"
        />
        <StatCard
          title="Cartera Pendiente"
          value={formatCurrency(resumenFinanciero.carteraPendiente)}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Resultado"
          value={formatCurrency(resumenFinanciero.resultado)}
          icon={TrendingUp}
          variant={resumenFinanciero.resultado >= 0 ? 'success' : 'danger'}
        />
      </div>

      {/* Categories Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado por Categoría</CardTitle>
          <CardDescription>Progreso y estadísticas por cada categoría del torneo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {categorias.map((categoria) => {
              const partidosCat = partidos.filter(p => p.categoriaId === categoria.id)
              const jugadosCat = partidosCat.filter(p => p.estado === 'jugado').length
              const progressCat = partidosCat.length > 0 ? Math.round((jugadosCat / partidosCat.length) * 100) : 0

              return (
                <Card 
                  key={categoria.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border"
                  onClick={() => onNavigate('categorias')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: categoria.color }}
                      />
                      <span className="font-semibold text-sm">{categoria.nombre}</span>
                      {!categoria.activa && (
                        <Badge variant="secondary" className="text-[10px] h-4">Inactiva</Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{categoria.equipos} equipos</span>
                        <span>{progressCat}%</span>
                      </div>
                      <Progress value={progressCat} className="h-1.5" />
                      <p className="text-xs text-muted-foreground">
                        {jugadosCat}/{partidosCat.length} partidos
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Matches Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming Matches */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Próximos Partidos</CardTitle>
              <CardDescription>Partidos programados</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('partidos')}>
              Ver todos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proximosPartidos.map((partido) => {
                const local = getEquipoById(partido.equipoLocalId)
                const visitante = getEquipoById(partido.equipoVisitanteId)
                const categoria = categorias.find(c => c.id === partido.categoriaId)

                return (
                  <div 
                    key={partido.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatShortDate(partido.fecha)}
                        </p>
                        <p className="text-sm font-bold">{partido.hora}</p>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{local?.nombre} vs {visitante?.nombre}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className="text-[10px] h-4"
                            style={{ borderColor: categoria?.color, color: categoria?.color }}
                          >
                            {categoria?.nombre}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{partido.cancha}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={partido.estado === 'programado' ? 'default' : 'secondary'}>
                      {partido.estado === 'programado' ? 'Programado' : 'Pendiente'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Latest Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Últimos Resultados</CardTitle>
              <CardDescription>Partidos jugados recientemente</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('estadisticas')}>
              Ver tabla
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ultimosResultados.map((partido) => {
                const local = getEquipoById(partido.equipoLocalId)
                const visitante = getEquipoById(partido.equipoVisitanteId)
                const categoria = categorias.find(c => c.id === partido.categoriaId)

                return (
                  <div 
                    key={partido.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[50px]">
                        <p className="text-xs font-medium text-muted-foreground">
                          {formatShortDate(partido.fecha)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-28 text-right truncate">{local?.nombre}</span>
                        <div className="flex items-center justify-center min-w-[60px] px-2 py-1 rounded bg-secondary text-secondary-foreground">
                          <span className="font-bold">{partido.golesLocal}</span>
                          <span className="mx-1 text-muted-foreground">-</span>
                          <span className="font-bold">{partido.golesVisitante}</span>
                        </div>
                        <span className="text-sm font-medium w-28 truncate">{visitante?.nombre}</span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-[10px] h-4"
                      style={{ borderColor: categoria?.color, color: categoria?.color }}
                    >
                      {categoria?.nombre}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Resumen Financiero</CardTitle>
            <CardDescription>Estado general de ingresos y egresos</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('finanzas')}>
            Ver detalle
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Ingresos Esperados</p>
              <p className="text-lg font-bold">{formatCurrency(resumenFinanciero.ingresosEsperados)}</p>
            </div>
            <div className="p-4 rounded-lg bg-success/10">
              <p className="text-xs text-muted-foreground mb-1">Ingresos Cobrados</p>
              <p className="text-lg font-bold text-success">{formatCurrency(resumenFinanciero.ingresosCobrados)}</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10">
              <p className="text-xs text-muted-foreground mb-1">Cartera Pendiente</p>
              <p className="text-lg font-bold text-warning-foreground">{formatCurrency(resumenFinanciero.carteraPendiente)}</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10">
              <p className="text-xs text-muted-foreground mb-1">Egresos</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(resumenFinanciero.totalEgresos)}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Resultado</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(resumenFinanciero.resultado)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
