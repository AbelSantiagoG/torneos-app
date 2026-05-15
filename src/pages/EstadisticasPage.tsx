import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trophy, Target, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { getDashboardCounts } from '@/features/dashboard/dashboardService'
import {
  fetchEstadisticasFiltradas,
  formatVistaCell,
  rowKeysForTable,
  type VistaRow,
} from '@/features/estadisticas/estadisticasService'
import { listFasesPorCategoria } from '@/features/fases/fasesTorneoService'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'

function pickNombreEquipo(row: VistaRow): string {
  return (
    pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club') ||
    pickStr(row, 'nombre') ||
    '—'
  )
}

function pickNombreJugador(row: VistaRow): string {
  return pickStr(row, 'jugador', 'nombre_jugador', 'nombre_completo', 'nombres', 'nombre') || '—'
}

export function EstadisticasPage() {
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedFase, setSelectedFase] = useState('')
  const [activeTab, setActiveTab] = useState('posiciones')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [] } = useCategorias(torneoId)
  const statsQ = useQuery({
    queryKey: ['estadisticas', torneoId, selectedCategoria, selectedFase],
    enabled: Boolean(torneoId && selectedCategoria),
    queryFn: () => fetchEstadisticasFiltradas(torneoId!, selectedCategoria, selectedFase),
  })
  const statsData = statsQ.data
  const statsLoading = statsQ.isLoading
  const statsError = statsQ.error

  const countsQ = useQuery({
    queryKey: ['estadisticas-partidos-jugados', torneoId],
    enabled: Boolean(torneoId),
    queryFn: () => getDashboardCounts(torneoId!),
  })

  useEffect(() => {
    if (categorias.length && !selectedCategoria) setSelectedCategoria(categorias[0]!.id)
  }, [categorias, selectedCategoria])

  const { data: fasesList = [] } = useQuery({
    queryKey: ['estadisticas-fases', selectedCategoria],
    enabled: Boolean(selectedCategoria),
    queryFn: () => listFasesPorCategoria(selectedCategoria),
  })

  useEffect(() => {
    setSelectedFase('')
  }, [selectedCategoria])

  useEffect(() => {
    if (statsError) toast.error(statsError instanceof Error ? statsError.message : 'Error al cargar estadísticas')
  }, [statsError])

  const tabla = statsData?.tabla ?? []
  const goleadores = statsData?.goleadores ?? []
  const disciplina = statsData?.disciplina ?? []

  const tablaKeys = useMemo(() => rowKeysForTable(tabla), [tabla])
  const goleadoresKeys = useMemo(() => rowKeysForTable(goleadores), [goleadores])
  const disciplinaKeys = useMemo(() => rowKeysForTable(disciplina), [disciplina])

  const categoria = categorias.find((c) => c.id === selectedCategoria)
  const partidosJugados = countsQ.data?.partidosJugados ?? 0
  const sinEstadisticasJugadas = !countsQ.isLoading && partidosJugados === 0

  const liderRow = tabla[0]
  const topGoleador = goleadores[0]

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Estadísticas" description="Tabla de posiciones, goleadores y disciplina" />
        <EmptyState icon={Trophy} title="Sin torneo activo" description="Activa un torneo para ver estadísticas." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Estadísticas" description="Tabla de posiciones, goleadores y disciplina del torneo activo" />

      {sinEstadisticasJugadas ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Trophy}
              title="No hay estadísticas disponibles"
              description="Aún no hay estadísticas porque no hay partidos jugados."
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <TabsList>
              <TabsTrigger value="posiciones">Tabla de Posiciones</TabsTrigger>
              <TabsTrigger value="goleadores">Goleadores</TabsTrigger>
              <TabsTrigger value="disciplina">Disciplina</TabsTrigger>
            </TabsList>

            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedFase || '__all__'} onValueChange={(v) => setSelectedFase(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas las fases</SelectItem>
                  {fasesList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="posiciones" className="space-y-4">
            {statsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                {liderRow && (
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/20">
                          <Trophy className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">Líder {categoria?.nombre}</p>
                          <h3 className="flex items-center gap-3 text-2xl font-bold">
                            <div className="h-5 w-5 rounded-full" style={{ backgroundColor: categoria?.color }} />
                            {pickNombreEquipo(liderRow)}
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {selectedFase
                              ? fasesList.find((f) => f.id === selectedFase)?.nombre
                              : 'Todas las fases'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Tabla de Posiciones — {categoria?.nombre}</CardTitle>
                    <CardDescription>
                      {selectedFase ? 'Tabla por fase seleccionada' : 'Acumulado de la categoría'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {tabla.length === 0 ? (
                      <EmptyState
                        icon={Trophy}
                        title="Sin datos de tabla"
                        description="No hay datos de tabla para esta categoría o fase."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {tablaKeys.map((k) => (
                                <TableHead key={k}>{k.replace(/_/g, ' ')}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tabla.map((row, idx) => (
                              <TableRow key={idx}>
                                {tablaKeys.map((k) => (
                                  <TableCell key={k}>{formatVistaCell(row[k])}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="goleadores" className="space-y-4">
            {statsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                {topGoleador && (
                  <Card className="border-chart-1/20 bg-gradient-to-r from-chart-1/10 via-chart-1/5 to-transparent">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-chart-1/20">
                          <Target className="h-10 w-10 text-chart-1" />
                        </div>
                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">Goleador</p>
                          <h3 className="text-2xl font-bold">{pickNombreJugador(topGoleador)}</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {pickNum(topGoleador, 'goles', 'total_goles', 'cantidad_goles')} goles —{' '}
                            {pickStr(topGoleador, 'equipo_nombre', 'nombre_equipo', 'equipo') || 'Equipo'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Tabla de Goleadores</CardTitle>
                    <CardDescription>Ranking de goleadores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {goleadores.length === 0 ? (
                      <EmptyState icon={Target} title="Sin goleadores" description="No hay goles registrados en esta categoría o fase." />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {goleadoresKeys.map((k) => (
                                <TableHead key={k}>{k.replace(/_/g, ' ')}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {goleadores.map((row, idx) => (
                              <TableRow key={idx}>
                                {goleadoresKeys.map((k) => (
                                  <TableCell key={k}>{formatVistaCell(row[k])}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="disciplina" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Disciplina
                </CardTitle>
                <CardDescription>Tarjetas acumuladas</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : disciplina.length === 0 ? (
                  <EmptyState
                    icon={AlertTriangle}
                    title="Sin datos de disciplina"
                    description="No hay tarjetas registradas en esta categoría o fase."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {disciplinaKeys.map((k) => (
                            <TableHead key={k}>{k.replace(/_/g, ' ')}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disciplina.map((row, idx) => {
                          const am = pickNum(row, 'amarillas', 'tarjetas_amarillas', 'ta')
                          const ro = pickNum(row, 'rojas', 'tarjetas_rojas', 'tr')
                          const riesgo = ro > 0 || am >= 3
                          return (
                            <TableRow key={idx} className={riesgo ? 'bg-destructive/5' : ''}>
                              {disciplinaKeys.map((k) => (
                                <TableCell key={k}>{formatVistaCell(row[k])}</TableCell>
                              ))}
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
