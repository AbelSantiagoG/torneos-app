import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Calendar, Clock, MapPin, AlertTriangle, Shuffle, Edit, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { formatDate } from '@/lib/utils'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { usePartidosTorneo } from '@/features/partidos/usePartidosTorneo'
import { groupByFecha } from '@/features/partidos/partidosService'
import type { PartidoListaUi } from '@/features/partidos/partidosService'
import { isJugadoEstado, isProgramadoEstado } from '@/features/partidos/partidosUi'

interface PartidosPageProps {
  onOpenActa?: () => void
}

function initials(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function findConflictIdsForFecha(list: PartidoListaUi[]): string[] {
  const conflicts: string[] = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const p1 = list[i]!
      const p2 = list[j]!
      if (p1.hora && p2.hora && p1.hora === p2.hora && p1.cancha && p2.cancha && p1.cancha === p2.cancha) {
        conflicts.push(p1.id, p2.id)
      }
    }
  }
  return conflicts
}

export function PartidosPage({ onOpenActa }: PartidosPageProps) {
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [activeTab, setActiveTab] = useState('categoria')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)
  const { data: partidosAll = [], isLoading: parLoading, error: parError } = usePartidosTorneo(torneoId)

  useEffect(() => {
    if (parError) toast.error(parError instanceof Error ? parError.message : 'Error al cargar partidos')
  }, [parError])

  useEffect(() => {
    if (categorias.length && !selectedCategoria) {
      setSelectedCategoria(categorias[0]!.id)
    }
  }, [categorias, selectedCategoria])

  const partidosCategoria = useMemo(
    () => (selectedCategoria ? partidosAll.filter((p) => p.categoriaId === selectedCategoria) : partidosAll),
    [partidosAll, selectedCategoria],
  )

  const jornadas = useMemo(() => [...new Set(partidosCategoria.map((p) => p.jornada))].sort((a, b) => a - b), [partidosCategoria])

  const partidosPorFecha = useMemo(() => groupByFecha(partidosAll), [partidosAll])
  const fechasOrdenadas = useMemo(() => Object.keys(partidosPorFecha).sort(), [partidosPorFecha])

  const pendientesProgramar = useMemo(
    () =>
      partidosCategoria.filter(
        (p) => !isJugadoEstado(p.estado) && (!String(p.hora || '').trim() || !String(p.cancha || '').trim()),
      ),
    [partidosCategoria],
  )

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Partidos / Fixture" description="Programación de partidos" />
        <EmptyState
          icon={Calendar}
          title="Sin torneo activo"
          description="Selecciona un torneo activo para ver el fixture."
        />
      </div>
    )
  }

  const emptyFixture = !parLoading && partidosAll.length === 0

  return (
    <div className="space-y-6">
      <PageHeader title="Partidos / Fixture" description="Gestiona la programación de partidos, jornadas y resultados" />

      {emptyFixture ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Calendar}
              title="Sin partidos en el fixture"
              description="Aún no hay partidos registrados en Supabase para este torneo. Cuando existan, se listarán aquí."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      toast.message('La generación automática de fixture se conectará en una siguiente iteración.')
                    }
                  >
                    Generar fixture
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      toast.message('La programación manual de partidos se habilitará cuando el módulo esté listo.')
                    }
                  >
                    Programar partido
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:inline-flex lg:w-auto">
            <TabsTrigger value="categoria">Por Categoría</TabsTrigger>
            <TabsTrigger value="fecha">Por Fecha</TabsTrigger>
            <TabsTrigger value="sorteo">Sorteo de Horarios</TabsTrigger>
          </TabsList>

          <TabsContent value="categoria" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {catLoading ? (
                  <Skeleton className="h-10 w-64" />
                ) : categorias.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Sin categorías"
                    description="Crea categorías antes de organizar el fixture."
                  />
                ) : (
                  <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                    <SelectTrigger className="w-full md:w-64">
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
                )}
              </CardContent>
            </Card>

            {parLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : partidosCategoria.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="Sin partidos en esta categoría"
                description="No hay partidos asociados a la categoría seleccionada."
              />
            ) : (
              jornadas.map((jornada) => {
                const partidosJornada = partidosCategoria.filter((p) => p.jornada === jornada)
                return (
                  <Card key={jornada}>
                    <CardHeader>
                      <CardTitle className="text-lg">Jornada {jornada}</CardTitle>
                      <CardDescription>{partidosJornada.length} partidos</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {partidosJornada.map((partido) => {
                          const played = isJugadoEstado(partido.estado)
                          const colLocal = partido.categoriaColor || '#64748b'
                          const colVis = '#64748b'

                          return (
                            <Card key={partido.id} className="overflow-hidden">
                              <div className="p-4">
                                <div className="mb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {partido.fecha ? formatDate(partido.fecha) : 'Fecha por definir'}
                                  </div>
                                  <Badge variant={played ? 'default' : isProgramadoEstado(partido.estado) ? 'secondary' : 'outline'}>
                                    {played ? 'Jugado' : isProgramadoEstado(partido.estado) ? 'Programado' : partido.estado || 'Pendiente'}
                                  </Badge>
                                </div>

                                <div className="mb-3 flex items-center justify-between">
                                  <div className="flex flex-1 items-center gap-2">
                                    <div
                                      className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
                                      style={{ backgroundColor: colLocal }}
                                    >
                                      {initials(partido.equipoLocalNombre || 'L')}
                                    </div>
                                    <span className="truncate text-sm font-medium">{partido.equipoLocalNombre}</span>
                                  </div>

                                  {played ? (
                                    <div className="mx-2 flex min-w-[50px] items-center justify-center rounded bg-secondary px-2 py-1 text-secondary-foreground">
                                      <span className="font-bold">{partido.golesLocal ?? '—'}</span>
                                      <span className="mx-1">-</span>
                                      <span className="font-bold">{partido.golesVisitante ?? '—'}</span>
                                    </div>
                                  ) : (
                                    <span className="mx-2 text-muted-foreground">vs</span>
                                  )}

                                  <div className="flex flex-1 items-center justify-end gap-2">
                                    <span className="truncate text-sm font-medium">{partido.equipoVisitanteNombre}</span>
                                    <div
                                      className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
                                      style={{ backgroundColor: colVis }}
                                    >
                                      {initials(partido.equipoVisitanteNombre || 'V')}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {partido.hora || '—'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {partido.cancha || '—'}
                                    </span>
                                  </div>
                                  {onOpenActa && (
                                    <Button variant="ghost" size="sm" onClick={onOpenActa}>
                                      <Edit className="mr-1 h-3 w-3" />
                                      Acta
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="fecha" className="space-y-4">
            {fechasOrdenadas.length === 0 ? (
              <EmptyState icon={Calendar} title="Sin fechas en el fixture" description="No hay fechas agrupables para los partidos actuales." />
            ) : (
              fechasOrdenadas.map((fecha) => {
                const partidosFecha = partidosPorFecha[fecha] ?? []
                const conflicts = findConflictIdsForFecha([...partidosFecha].sort((a, b) => a.hora.localeCompare(b.hora)))
                const hasConflicts = conflicts.length > 0

                return (
                  <Card key={fecha}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg">
                            {fecha === 'sin-fecha' ? 'Sin fecha' : formatDate(fecha)}
                            {hasConflicts && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Conflicto
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{partidosFecha.length} partidos</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Hora</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Local</TableHead>
                            <TableHead className="text-center">Resultado</TableHead>
                            <TableHead>Visitante</TableHead>
                            <TableHead>Cancha</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...partidosFecha]
                            .sort((a, b) => String(a.hora).localeCompare(String(b.hora)))
                            .map((partido) => {
                            const played = isJugadoEstado(partido.estado)
                            const isConflict = conflicts.includes(partido.id)

                            return (
                              <TableRow key={partido.id} className={isConflict ? 'bg-destructive/5' : ''}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {isConflict && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                    {partido.hora || '—'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    style={{ borderColor: partido.categoriaColor, color: partido.categoriaColor }}
                                  >
                                    {partido.categoriaNombre}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: partido.categoriaColor }} />
                                    {partido.equipoLocalNombre}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {played ? (
                                    <span className="font-bold">
                                      {partido.golesLocal ?? '—'} - {partido.golesVisitante ?? '—'}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">vs</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
                                    {partido.equipoVisitanteNombre}
                                  </div>
                                </TableCell>
                                <TableCell className={isConflict ? 'font-medium text-destructive' : ''}>
                                  {partido.cancha || '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={played ? 'default' : isProgramadoEstado(partido.estado) ? 'secondary' : 'outline'}>
                                    {played ? 'Jugado' : isProgramadoEstado(partido.estado) ? 'Programado' : partido.estado || 'Pendiente'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </TabsContent>

          <TabsContent value="sorteo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Sorteo de Horarios</CardTitle>
                <CardDescription>
                  Partidos sin hora o cancha definida en la categoría seleccionada. La asignación automática se conectará después.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{pendientesProgramar.length}</p>
                    <p className="text-sm text-muted-foreground">Partidos pendientes de horario/cancha</p>
                  </div>
                  <Button
                    disabled={pendientesProgramar.length === 0}
                    onClick={() => toast.message('La asignación automática de horarios se implementará en una fase posterior.')}
                  >
                    <Shuffle className="mr-2 h-4 w-4" />
                    Asignar Horarios Automáticamente
                  </Button>
                </div>

                {pendientesProgramar.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Jornada</TableHead>
                        <TableHead>Partido</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Cancha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendientesProgramar.map((partido) => (
                        <TableRow key={partido.id}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              style={{ borderColor: partido.categoriaColor, color: partido.categoriaColor }}
                            >
                              {partido.categoriaNombre}
                            </Badge>
                          </TableCell>
                          <TableCell>Jornada {partido.jornada}</TableCell>
                          <TableCell>
                            {partido.equipoLocalNombre} vs {partido.equipoVisitanteNombre}
                          </TableCell>
                          <TableCell>{partido.fecha ? formatDate(partido.fecha) : '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{partido.hora || 'Sin asignar'}</TableCell>
                          <TableCell className="text-muted-foreground">{partido.cancha || 'Sin asignar'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.message('Editor de programación: pendiente de conexión con Supabase.')}
                            >
                              Programar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle className="mx-auto mb-4 h-12 w-12 text-success" />
                    <p className="font-medium">No hay partidos sin horario/cancha en esta categoría</p>
                    <p className="text-sm">O no hay partidos en la categoría seleccionada.</p>
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
