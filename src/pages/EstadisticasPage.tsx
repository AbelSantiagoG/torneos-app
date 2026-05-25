import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trophy, Target, AlertTriangle, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  fetchTablaPosicionesFaseGrupo,
  type CriterioClasificacion,
  type VistaRow,
} from '@/features/estadisticas/estadisticasService'
import { CRITERIOS_DEFECTO } from '@/features/estadisticas/criteriosClasificacionService'
import { listFasesPorCategoria } from '@/features/fases/fasesTorneoService'
import { pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import { estadisticasQueryKey, invalidateEstadisticasQueries } from '@/features/estadisticas/estadisticasCache'
import { CriteriosClasificacionPanel } from '@/features/estadisticas/CriteriosClasificacionPanel'
import { TablaPosicionesTable } from '@/features/estadisticas/TablaPosicionesTable'
import { isFasePorGrupos, listGrupoEquipos, listGruposFase, type GrupoFaseUi } from '@/features/grupos/gruposFaseService'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
function pickNombreEquipo(row: VistaRow): string {
  return pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo', 'club') || pickStr(row, 'nombre') || '—'
}

function pickNombreJugador(row: VistaRow): string {
  return pickStr(row, 'jugador', 'nombre_jugador', 'nombre_completo', 'nombres', 'nombre') || '—'
}

function PlayerPhoto({ row }: { row: VistaRow }) {
  const nombre = pickNombreJugador(row)
  const src = resolveDisplayImageUrl(
    pickStr(row, 'foto_public_id', 'jugador_foto_public_id'),
    pickStr(row, 'foto_url', 'jugador_foto_url'),
    displayImagePresets.jugadorFoto(),
  )
  if (src) return <img src={src} alt="" className="h-9 w-9 rounded-full border object-cover" />
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold">
      {nombre.slice(0, 2).toUpperCase() || <User className="h-4 w-4" />}
    </div>
  )
}

function TeamLogo({ row }: { row: VistaRow }) {
  const nombre = pickNombreEquipo(row)
  const src = resolveDisplayImageUrl(
    pickStr(row, 'logo_public_id', 'equipo_logo_public_id'),
    pickStr(row, 'logo_url', 'equipo_logo_url'),
    displayImagePresets.equipoLogoThumb(),
  )
  if (src) return <img src={src} alt="" className="h-14 w-14 rounded-xl border object-cover" />
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold">
      {nombre.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function EstadisticasPage() {
  const qc = useQueryClient()
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedFase, setSelectedFase] = useState('')
  const [activeTab, setActiveTab] = useState('posiciones')
  const [criteriosOrden, setCriteriosOrden] = useState<CriterioClasificacion[]>(CRITERIOS_DEFECTO)

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [] } = useCategorias(torneoId)
  const statsQ = useQuery({
    queryKey: estadisticasQueryKey(torneoId ?? '', selectedCategoria, selectedFase),
    enabled: Boolean(torneoId && selectedCategoria),
    queryFn: () => fetchEstadisticasFiltradas(torneoId!, selectedCategoria, selectedFase),
  })

  const countsQ = useQuery({
    queryKey: ['estadisticas-partidos-jugados', torneoId],
    enabled: Boolean(torneoId),
    queryFn: () => getDashboardCounts(torneoId!),
  })

  const { data: fasesList = [] } = useQuery({
    queryKey: ['estadisticas-fases', selectedCategoria],
    enabled: Boolean(selectedCategoria),
    queryFn: () => listFasesPorCategoria(selectedCategoria),
  })

  const faseSeleccionada = fasesList.find((f) => f.id === selectedFase)
  const faseEsPorGrupos = isFasePorGrupos(faseSeleccionada?.tipo)

  const gruposQ = useQuery({
    queryKey: ['estadisticas-grupos-fase', selectedFase],
    enabled: Boolean(selectedFase && faseEsPorGrupos),
    queryFn: () => listGruposFase(selectedFase),
  })

  const tablasGrupoQ = useQuery({
    queryKey: ['estadisticas-tablas-grupo', selectedFase, (gruposQ.data ?? []).map((g) => g.id).join('|')],
    enabled: Boolean(selectedFase && faseEsPorGrupos && (gruposQ.data ?? []).length),
    queryFn: async () => {
      const grupos = gruposQ.data ?? []
      return Promise.all(
        grupos.map(async (grupo: GrupoFaseUi) => ({
          grupo,
          rows: await fetchTablaPosicionesFaseGrupo(selectedFase, grupo.id),
        })),
      )
    },
  })

  const grupoEquiposQ = useQuery({
    queryKey: ['estadisticas-grupo-equipos', selectedFase],
    enabled: Boolean(selectedFase && faseEsPorGrupos),
    queryFn: () => listGrupoEquipos(selectedFase),
  })

  useEffect(() => {
    if (categorias.length && !selectedCategoria) setSelectedCategoria(categorias[0]!.id)
  }, [categorias, selectedCategoria])

  useEffect(() => {
    if (!selectedCategoria || !fasesList.length) {
      setSelectedFase('')
      return
    }
    const activa = fasesList.find((f) => f.activa) ?? fasesList[0]
    setSelectedFase(activa?.id ?? '')
  }, [selectedCategoria, fasesList])

  useEffect(() => {
    if (statsQ.error) {
      console.error('Error en estadísticas', { error: statsQ.error })
      toast.error('No se pudieron actualizar las estadísticas.')
    }
  }, [statsQ.error])

  const refrescarEstadisticas = useCallback(() => {
    if (!torneoId) return
    void statsQ.refetch()
    invalidateEstadisticasQueries(qc, {
      torneoId,
      categoriaId: selectedCategoria,
      faseId: selectedFase,
    })
    if (selectedFase) {
      void gruposQ.refetch()
      void tablasGrupoQ.refetch()
    }
  }, [qc, torneoId, selectedCategoria, selectedFase, statsQ, gruposQ, tablasGrupoQ])

  const tabla = statsQ.data?.tabla ?? []
  const goleadores = statsQ.data?.goleadores ?? []
  const disciplina = statsQ.data?.disciplina ?? []
  const tablasPorGrupo = tablasGrupoQ.data ?? []
  const equiposPorGrupo = grupoEquiposQ.data ?? []

  const rowsGrupoConFallback = (grupoId: string, rows: VistaRow[]): VistaRow[] => {
    if (rows.length) return rows
    return equiposPorGrupo
      .filter((item) => item.grupoId === grupoId)
      .map((item) => ({
        equipo_id: item.equipoId,
        equipo_nombre: item.equipoNombre,
        logo_url: item.logoUrl,
        logo_public_id: item.logoPublicId,
        pj: 0,
        pg: 0,
        pe: 0,
        pp: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        pts: 0,
        puntos: 0,
        fair_play: 0,
        amarillas: 0,
        rojas: 0,
      }))
  }

  const goleadoresOrdenados = [...goleadores].sort((a, b) => {
    const ga = pickNum(a, 'goles', 'total_goles', 'cantidad_goles')
    const gb = pickNum(b, 'goles', 'total_goles', 'cantidad_goles')
    if (ga !== gb) return gb - ga
    return pickNombreJugador(a).localeCompare(pickNombreJugador(b))
  })
  const disciplinaOrdenada = [...disciplina].sort((a, b) => {
    const fa = pickNum(a, 'fairplay', 'fair_play', 'puntos_fair_play')
    const fb = pickNum(b, 'fairplay', 'fair_play', 'puntos_fair_play')
    if (fa !== fb) return fa - fb
    return pickNombreJugador(a).localeCompare(pickNombreJugador(b))
  })

  const categoria = categorias.find((c) => c.id === selectedCategoria)
  const partidosJugados = countsQ.data?.partidosJugados ?? 0
  const sinEstadisticasJugadas = !countsQ.isLoading && partidosJugados === 0
  const statsLoading = statsQ.isLoading || statsQ.isFetching

  const liderRow = tabla[0]
  const topGoleador = goleadoresOrdenados[0]

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
              <Select value={selectedFase || undefined} onValueChange={setSelectedFase}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  {fasesList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nombre}
                      {f.activa ? ' (activa)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {statsLoading && (
            <p className="text-sm text-muted-foreground">Actualizando estadísticas…</p>
          )}

          <TabsContent value="posiciones" className="space-y-4">
            {statsQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                {liderRow && (
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                    <CardContent className="py-6">
                      <div className="flex items-center gap-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
                          <TeamLogo row={liderRow} />
                        </div>
                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">Líder {categoria?.nombre}</p>
                          <h3 className="text-2xl font-bold">{pickNombreEquipo(liderRow)}</h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {fasesList.find((f) => f.id === selectedFase)?.nombre ?? 'Fase'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedFase && (
                  <CriteriosClasificacionPanel
                    torneoId={torneoId}
                    categoriaId={selectedCategoria}
                    faseId={selectedFase}
                    onCriteriosChange={setCriteriosOrden}
                  />
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Tabla de Posiciones — {categoria?.nombre}</CardTitle>
                    <CardDescription>
                      Datos desde la configuración de la fase (partidos, goles, tarjetas y ajustes manuales).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {faseEsPorGrupos ? (
                      <Tabs defaultValue="general" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="general">Tabla general</TabsTrigger>
                          <TabsTrigger value="grupos">Por grupos</TabsTrigger>
                        </TabsList>
                        <TabsContent value="general">
                          <TablaPosicionesTable
                            rows={tabla}
                            criterios={criteriosOrden}
                            faseId={selectedFase}
                            onRefresh={refrescarEstadisticas}
                          />
                        </TabsContent>
                        <TabsContent value="grupos" className="space-y-4">
                          {gruposQ.isLoading || tablasGrupoQ.isLoading || grupoEquiposQ.isLoading ? (
                            <Skeleton className="h-48 w-full" />
                          ) : tablasPorGrupo.length === 0 ? (
                            <EmptyState
                              icon={Trophy}
                              title="Sin grupos"
                              description="No hay grupos configurados para esta fase."
                            />
                          ) : (
                            tablasPorGrupo.map(({ grupo, rows }) => (
                              <div key={grupo.id} className="space-y-3 rounded-md border p-4">
                                <div>
                                  <h3 className="text-lg font-semibold">{grupo.nombre || 'Grupo'}</h3>
                                  <p className="text-sm text-muted-foreground">Tabla de posiciones de este grupo.</p>
                                </div>
                                  <TablaPosicionesTable
                                    rows={rowsGrupoConFallback(grupo.id, rows)}
                                    criterios={criteriosOrden}
                                    faseId={selectedFase}
                                    onRefresh={refrescarEstadisticas}
                                  />
                              </div>
                            ))
                          )}
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <TablaPosicionesTable
                        rows={tabla}
                        criterios={criteriosOrden}
                        faseId={selectedFase}
                        onRefresh={refrescarEstadisticas}
                      />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="goleadores" className="space-y-4">
            {statsQ.isLoading ? (
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
                    <CardDescription>Se actualiza al guardar goles en el acta</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {goleadores.length === 0 ? (
                      <EmptyState
                        icon={Target}
                        title="Sin goleadores"
                        description="No hay goles registrados en esta categoría o fase."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Foto</TableHead>
                              <TableHead>Jugador</TableHead>
                              <TableHead>Equipo</TableHead>
                              <TableHead className="text-center">Goles</TableHead>
                              <TableHead className="text-center">Penal</TableHead>
                              <TableHead className="text-center">Tiro libre</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {goleadoresOrdenados.map((row, idx) => (
                              <TableRow key={`${pickNombreJugador(row)}-${idx}`}>
                                <TableCell>
                                  <PlayerPhoto row={row} />
                                </TableCell>
                                <TableCell className="font-medium">{pickNombreJugador(row)}</TableCell>
                                <TableCell>{pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo') || 'Equipo'}</TableCell>
                                <TableCell className="text-center font-semibold tabular-nums">
                                  {pickNum(row, 'goles', 'total_goles', 'cantidad_goles')}
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  {pickNum(row, 'goles_penal', 'penales', 'goles_de_penal')}
                                </TableCell>
                                <TableCell className="text-center tabular-nums">
                                  {pickNum(row, 'goles_tiro_libre', 'tiros_libres', 'goles_de_tiro_libre')}
                                </TableCell>
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
                <CardDescription>Tarjetas acumuladas (Fair Play en tabla de posiciones)</CardDescription>
              </CardHeader>
              <CardContent>
                {statsQ.isLoading ? (
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
                          <TableHead>Jugador</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead className="text-center">Amarillas</TableHead>
                          <TableHead className="text-center">Rojas</TableHead>
                          <TableHead className="text-center">Doble amarilla</TableHead>
                          <TableHead className="text-center">Fair Play</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {disciplinaOrdenada.map((row, idx) => {
                          const am = pickNum(row, 'amarillas', 'tarjetas_amarillas', 'ta')
                          const ro = pickNum(row, 'rojas', 'tarjetas_rojas', 'tr')
                          const doble = pickNum(row, 'doble_amarilla', 'dobles_amarillas', 'tarjetas_doble_amarilla')
                          const fairplay = pickNum(row, 'fairplay', 'fair_play', 'puntos_fair_play')
                          const riesgo = ro > 0 || am >= 3
                          return (
                            <TableRow key={idx} className={riesgo ? 'bg-destructive/5' : ''}>
                              <TableCell className="font-medium">{pickNombreJugador(row)}</TableCell>
                              <TableCell>{pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo') || 'Equipo'}</TableCell>
                              <TableCell className="text-center tabular-nums">{am}</TableCell>
                              <TableCell className="text-center tabular-nums">{ro}</TableCell>
                              <TableCell className="text-center tabular-nums">{doble}</TableCell>
                              <TableCell className="text-center font-semibold tabular-nums">{fairplay}</TableCell>
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
