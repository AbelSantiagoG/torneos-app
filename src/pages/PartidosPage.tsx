import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  AlertTriangle,
  Shuffle,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { translateUserError } from '@/lib/errorMessages'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { usePartidosTorneo, partidosTorneoQueryKey } from '@/features/partidos/usePartidosTorneo'
import {
  groupByFecha,
  countPartidosEnCategoria,
  generarFixtureCategoria,
  deletePartidoCascade,
  updatePartido,
  createPartidoManual,
  upsertProgramacion,
  generarBorradorSorteo,
} from '@/features/partidos/partidosService'
import type { PartidoListaUi } from '@/features/partidos/partidosService'
import { isJugadoEstado } from '@/features/partidos/partidosUi'
import { countEquiposEnCategoria } from '@/features/equipos/equiposService'
import { useEquipos } from '@/features/equipos/useEquipos'
import { useCanchas } from '@/features/canchas/useCanchas'
import { useHorarios } from '@/features/horarios/useHorarios'
import { formatHoraUi, normalizeHoraDb } from '@/features/horarios/horariosService'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'

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

function TeamAvatar({
  nombre,
  color,
  logoUrl,
  logoPublicId,
}: {
  nombre: string
  color: string
  logoUrl?: string | null
  logoPublicId?: string | null
}) {
  const src = resolveDisplayImageUrl(logoPublicId, logoUrl, displayImagePresets.equipoLogoThumb())
  if (src) {
    return <img src={src} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials(nombre || '?')}
    </div>
  )
}

export function PartidosPage({ onOpenActa }: PartidosPageProps) {
  const qc = useQueryClient()
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [activeTab, setActiveTab] = useState('categoria')
  const [fixtureOpen, setFixtureOpen] = useState(false)
  const [generandoFixture, setGenerandoFixture] = useState(false)
  const [sorteoCategoria, setSorteoCategoria] = useState('')
  const [sorteoFecha, setSorteoFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [sorteoDias, setSorteoDias] = useState('14')
  const [sorteoDrafts, setSorteoDrafts] = useState<Record<string, { fecha: string; canchaId: string; hora: string }>>({})
  const [guardandoSorteo, setGuardandoSorteo] = useState(false)

  const [editPartido, setEditPartido] = useState<PartidoListaUi | null>(null)
  const [editJornada, setEditJornada] = useState('')
  const [editOrden, setEditOrden] = useState('')
  const [editLocal, setEditLocal] = useState('')
  const [editVisit, setEditVisit] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [nuevoLocal, setNuevoLocal] = useState('')
  const [nuevoVisit, setNuevoVisit] = useState('')
  const [nuevoJornada, setNuevoJornada] = useState('1')
  const [nuevoOrden, setNuevoOrden] = useState('0')

  const [progPartido, setProgPartido] = useState<PartidoListaUi | null>(null)
  const [progFecha, setProgFecha] = useState('')
  const [progHora, setProgHora] = useState('09:00')
  const [progCancha, setProgCancha] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)
  const { data: bundle, isLoading: parLoading, error: parError } = usePartidosTorneo(torneoId)

  const fixture = bundle?.fixture ?? []
  const programados = bundle?.programados ?? []
  const programmedIds = useMemo(() => new Set(programados.map((p) => p.id)), [programados])

  const { data: equiposCat = [] } = useEquipos(selectedCategoria || undefined, torneoId)
  const { data: canchas = [] } = useCanchas(torneoId)
  const { data: horariosLista = [] } = useHorarios(torneoId)

  useEffect(() => {
    if (parError) toast.error(translateUserError(parError, 'fixture'))
  }, [parError])

  useEffect(() => {
    if (categorias.length && !selectedCategoria) {
      setSelectedCategoria(categorias[0]!.id)
    }
  }, [categorias, selectedCategoria])

  useEffect(() => {
    if (categorias.length && !sorteoCategoria) {
      setSorteoCategoria(categorias[0]!.id)
    }
  }, [categorias, sorteoCategoria])

  useEffect(() => {
    setSorteoDrafts({})
  }, [sorteoCategoria])

  const categoriaActiva = useMemo(
    () => categorias.find((c) => c.id === selectedCategoria),
    [categorias, selectedCategoria],
  )

  const partidosCategoria = useMemo(
    () => (selectedCategoria ? fixture.filter((p) => p.categoriaId === selectedCategoria) : []),
    [fixture, selectedCategoria],
  )

  const partidosSorteo = useMemo(
    () => (sorteoCategoria ? fixture.filter((p) => p.categoriaId === sorteoCategoria) : []),
    [fixture, sorteoCategoria],
  )

  const pendientesSorteo = useMemo(
    () => partidosSorteo.filter((p) => !programmedIds.has(p.id)),
    [partidosSorteo, programmedIds],
  )

  const jornadas = useMemo(
    () => [...new Set(partidosCategoria.map((p) => p.jornada))].sort((a, b) => a - b),
    [partidosCategoria],
  )

  const partidosPorFecha = useMemo(() => groupByFecha(programados), [programados])
  const fechasOrdenadas = useMemo(() => Object.keys(partidosPorFecha).sort(), [partidosPorFecha])

  const invalidatePartidos = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: partidosTorneoQueryKey(torneoId) })
  }

  const ejecutarGenerarFixture = async () => {
    if (!selectedCategoria || !torneoId) {
      toast.error('Selecciona una categoría.')
      return
    }
    if (categoriaActiva?.formato && categoriaActiva.formato !== 'todos_contra_todos') {
      toast.error('Por ahora solo se puede generar automáticamente el fixture en formato "Todos contra todos".')
      return
    }
    setGenerandoFixture(true)
    try {
      const nEq = await countEquiposEnCategoria(selectedCategoria)
      if (nEq < 2) {
        toast.error('Se necesitan al menos dos equipos en la categoría para generar el fixture.')
        return
      }
      const nPar = await countPartidosEnCategoria(selectedCategoria)
      if (nPar > 0) {
        toast.error('Esta categoría ya tiene partidos en el fixture.')
        return
      }
      await generarFixtureCategoria(selectedCategoria, new Date().toISOString().slice(0, 10))
      toast.success('Fixture generado.')
      setFixtureOpen(false)
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGenerandoFixture(false)
    }
  }

  const openEdit = (p: PartidoListaUi) => {
    setEditPartido(p)
    setEditJornada(String(p.jornada ?? ''))
    setEditOrden(String(p.orden ?? 0))
    setEditLocal(p.equipoLocalId ?? '')
    setEditVisit(p.equipoVisitanteId ?? '')
  }

  const saveEdit = async () => {
    if (!editPartido) return
    try {
      await updatePartido(editPartido.id, {
        jornada: Number(editJornada) || 0,
        orden: Number(editOrden) || 0,
        equipo_local_id: editLocal,
        equipo_visitante_id: editVisit,
      })
      toast.success('Partido actualizado')
      setEditPartido(null)
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    }
  }

  const eliminarPartido = async (p: PartidoListaUi) => {
    if (!confirm('¿Eliminar este partido del fixture? Se borrarán también programación, goles y acta asociados si existen.')) return
    try {
      await deletePartidoCascade(p.id)
      toast.success('Partido eliminado')
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    }
  }

  const crearManual = async () => {
    if (!torneoId || !selectedCategoria) return
    if (!nuevoLocal || !nuevoVisit || nuevoLocal === nuevoVisit) {
      toast.error('Selecciona equipos local y visitante distintos.')
      return
    }
    try {
      await createPartidoManual({
        torneo_id: torneoId,
        categoria_id: selectedCategoria,
        equipo_local_id: nuevoLocal,
        equipo_visitante_id: nuevoVisit,
        jornada: Number(nuevoJornada) || 1,
        orden: (() => {
          const n = Number(nuevoOrden)
          return n > 0 ? n : undefined
        })(),
      })
      toast.success('Partido creado')
      setCreateOpen(false)
      setNuevoLocal('')
      setNuevoVisit('')
      setNuevoJornada('1')
      setNuevoOrden('0')
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    }
  }

  const llenarBorradorSorteo = () => {
    if (!torneoId || !sorteoCategoria) return
    const dias = Number(sorteoDias)
    if (Number.isNaN(dias) || dias < 1) {
      toast.error('Indica un número de días válido (1 o más).')
      return
    }
    const canchasActivas = canchas.filter((c) => c.activa !== false)
    if (!canchasActivas.length || !horariosLista.length) {
      toast.error('Configura canchas activas y horarios en Configuración.')
      return
    }
    if (!pendientesSorteo.length) {
      toast.message('No hay partidos pendientes de programar en esta categoría.')
      return
    }
    try {
      const borrador = generarBorradorSorteo({
        pendientes: pendientesSorteo,
        programados,
        canchas: canchasActivas.map((c) => ({ id: c.id })),
        horarios: horariosLista.map((h) => ({ hora: h.hora })),
        fechaInicio: sorteoFecha,
        dias,
      })
      setSorteoDrafts(borrador)
      toast.success('Propuesta generada. Revisa y guarda cuando esté listo.')
    } catch (e) {
      toast.error(translateUserError(e, 'programacion'))
    }
  }

  const guardarBorradorSorteo = async () => {
    if (!torneoId || !sorteoCategoria) return
    setGuardandoSorteo(true)
    let guardados = 0
    try {
      const horasActivas = horariosLista.filter((h) => h.activo !== false)
      const canchasActivas = canchas.filter((c) => c.activa !== false)
      const defaultHora = horasActivas[0] ? formatHoraUi(normalizeHoraDb(horasActivas[0]!.hora)) : ''

      for (const p of pendientesSorteo) {
        const d = sorteoDrafts[p.id]
        const eff = {
          fecha: d?.fecha ?? sorteoFecha,
          canchaId: d?.canchaId ?? canchasActivas[0]?.id ?? '',
          hora: d?.hora ?? defaultHora,
        }
        if (!eff.canchaId || !eff.fecha || !eff.hora) continue
        await upsertProgramacion(p.programacionId ?? null, {
          partido_id: p.id,
          cancha_id: eff.canchaId,
          fecha: eff.fecha,
          hora_inicio: eff.hora,
        })
        guardados++
      }
      if (!guardados) {
        toast.error('Completa al menos un partido con fecha, cancha y hora antes de guardar.')
        return
      }
      toast.success(`Se guardaron ${guardados} programación${guardados === 1 ? '' : 'es'}.`)
      setSorteoDrafts({})
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'programacion'))
    } finally {
      setGuardandoSorteo(false)
    }
  }

  const guardarProgramacionManual = async () => {
    if (!progPartido || !progCancha || !progFecha) {
      toast.error('Completa fecha y cancha.')
      return
    }
    try {
      await upsertProgramacion(progPartido.programacionId ?? null, {
        partido_id: progPartido.id,
        cancha_id: progCancha,
        fecha: progFecha,
        hora_inicio: progHora,
      })
      toast.success('Programación guardada')
      setProgPartido(null)
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'programacion'))
    }
  }

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partidos / Fixture"
        description="1) Por categoría: emparejamientos y jornadas. 2) Sorteo: fecha, cancha y hora en programaciones. 3) Por fecha: solo lo ya programado."
      />

      <Dialog open={fixtureOpen} onOpenChange={setFixtureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar fixture (todos contra todos)</DialogTitle>
            <DialogDescription>
              Se crearán las jornadas y los enfrentamientos en la categoría seleccionada. La fecha y hora de juego se
              asignan después en Sorteo de horarios.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFixtureOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void ejecutarGenerarFixture()} disabled={generandoFixture}>
              {generandoFixture ? 'Generando…' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editPartido)} onOpenChange={(o) => !o && setEditPartido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar partido</DialogTitle>
            <DialogDescription>Cambia jornada, orden de partido o equipos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Jornada</Label>
              <Input value={editJornada} onChange={(e) => setEditJornada(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Orden en la jornada</Label>
              <Input value={editOrden} onChange={(e) => setEditOrden(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Local</Label>
              <Select value={editLocal} onValueChange={setEditLocal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equiposCat.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visitante</Label>
              <Select value={editVisit} onValueChange={setEditVisit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equiposCat.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPartido(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEdit()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo partido manual</DialogTitle>
            <DialogDescription>En la categoría seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Local</Label>
              <Select value={nuevoLocal} onValueChange={setNuevoLocal}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipo local" />
                </SelectTrigger>
                <SelectContent>
                  {equiposCat.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visitante</Label>
              <Select value={nuevoVisit} onValueChange={setNuevoVisit}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipo visitante" />
                </SelectTrigger>
                <SelectContent>
                  {equiposCat.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Jornada</Label>
              <Input value={nuevoJornada} onChange={(e) => setNuevoJornada(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Orden (opcional, 0 = automático)</Label>
              <Input value={nuevoOrden} onChange={(e) => setNuevoOrden(e.target.value)} type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void crearManual()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(progPartido)} onOpenChange={(o) => !o && setProgPartido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar partido</DialogTitle>
            <DialogDescription>
              Crea o actualiza la fila en programaciones (cancha obligatoria en base de datos).
            </DialogDescription>
          </DialogHeader>
          {progPartido && (
            <div className="grid gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                {progPartido.equipoLocalNombre} vs {progPartido.equipoVisitanteNombre}
              </p>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={progFecha} onChange={(e) => setProgFecha(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Hora inicio</Label>
                <Input type="time" value={progHora} onChange={(e) => setProgHora(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Cancha</Label>
                <Select value={progCancha} onValueChange={setProgCancha}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cancha" />
                  </SelectTrigger>
                  <SelectContent>
                    {canchas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgPartido(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarProgramacionManual()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:inline-flex lg:w-auto">
          <TabsTrigger value="categoria">Por Categoría</TabsTrigger>
          <TabsTrigger value="sorteo">Sorteo de Horarios</TabsTrigger>
          <TabsTrigger value="fecha">Por Fecha</TabsTrigger>
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
                <div className="flex flex-wrap items-end gap-3">
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setFixtureOpen(true)}>
                    Generar fixture
                  </Button>
                  <Button type="button" size="sm" onClick={() => setCreateOpen(true)} disabled={!selectedCategoria}>
                    <Plus className="mr-1 h-4 w-4" />
                    Partido manual
                  </Button>
                </div>
              )}
              {categoriaActiva?.formato && categoriaActiva.formato !== 'todos_contra_todos' && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Formato {categoriaActiva.formato}: la generación automática del fixture es próximamente; puedes crear
                  partidos manualmente.
                </p>
              )}
            </CardContent>
          </Card>

          {parLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : partidosCategoria.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sin partidos en esta categoría"
              description="Genera el fixture (todos contra todos) o crea partidos manualmente."
              action={
                <Button type="button" variant="default" onClick={() => setFixtureOpen(true)}>
                  Generar fixture
                </Button>
              }
            />
          ) : (
            jornadas.map((jornada) => {
              const partidosJornada = partidosCategoria.filter((p) => p.jornada === jornada)
              return (
                <Card key={jornada}>
                  <CardHeader>
                    <CardTitle className="text-lg">Jornada {jornada}</CardTitle>
                    <CardDescription>{partidosJornada.length} partidos — solo emparejamientos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {partidosJornada.map((partido) => {
                        const colLocal = partido.categoriaColor || '#64748b'
                        const colVis = '#64748b'

                        return (
                          <Card key={partido.id} className="overflow-hidden">
                            <div className="p-4">
                              <p className="mb-3 text-xs text-muted-foreground">Orden {partido.orden ?? 0}</p>

                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <TeamAvatar
                                    nombre={partido.equipoLocalNombre}
                                    color={colLocal}
                                    logoUrl={partido.equipoLocalLogoUrl}
                                    logoPublicId={partido.equipoLocalLogoPublicId}
                                  />
                                  <span className="truncate text-sm font-medium">{partido.equipoLocalNombre}</span>
                                </div>

                                <span className="mx-1 shrink-0 text-muted-foreground">vs</span>

                                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                                  <span className="truncate text-sm font-medium">{partido.equipoVisitanteNombre}</span>
                                  <TeamAvatar
                                    nombre={partido.equipoVisitanteNombre}
                                    color={colVis}
                                    logoUrl={partido.equipoVisitanteLogoUrl}
                                    logoPublicId={partido.equipoVisitanteLogoPublicId}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
                                <span>
                                  Fecha, hora y cancha se asignan en <strong>Sorteo de horarios</strong>.
                                </span>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEdit(partido)}>
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => void eliminarPartido(partido)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                  {onOpenActa && (
                                    <Button variant="ghost" size="sm" onClick={onOpenActa}>
                                      Acta
                                    </Button>
                                  )}
                                </div>
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

        <TabsContent value="sorteo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sorteo de Horarios</CardTitle>
              <CardDescription>
                Asigna fecha, cancha y hora a los partidos del fixture que aún no tienen programación. Elige la categoría,
                genera una propuesta al azar, ajusta manualmente y guarda cuando esté listo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <Select value={sorteoCategoria} onValueChange={setSorteoCategoria}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Primera fecha</Label>
                  <Input type="date" value={sorteoFecha} onChange={(e) => setSorteoFecha(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Días a explorar</Label>
                  <Input value={sorteoDias} onChange={(e) => setSorteoDias(e.target.value)} className="w-24" />
                </div>
                <Button type="button" disabled={pendientesSorteo.length === 0} onClick={() => llenarBorradorSorteo()}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Asignar al azar
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={guardandoSorteo || pendientesSorteo.length === 0}
                  onClick={() => void guardarBorradorSorteo()}
                >
                  {guardandoSorteo ? 'Guardando…' : 'Guardar programación'}
                </Button>
              </div>

              {pendientesSorteo.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Jornada</TableHead>
                      <TableHead>Partido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cancha</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendientesSorteo.map((partido) => {
                      const horasActivas = horariosLista.filter((h) => h.activo !== false)
                      const canchasActivas = canchas.filter((c) => c.activa !== false)
                      const d = sorteoDrafts[partido.id]
                      const defaultHora = horasActivas[0]
                        ? formatHoraUi(normalizeHoraDb(horasActivas[0]!.hora))
                        : ''
                      const eff = {
                        fecha: d?.fecha ?? sorteoFecha,
                        canchaId: d?.canchaId ?? canchasActivas[0]?.id ?? '',
                        hora: d?.hora ?? defaultHora,
                      }
                      return (
                        <TableRow key={partido.id}>
                          <TableCell>Jornada {partido.jornada}</TableCell>
                          <TableCell>
                            {partido.equipoLocalNombre} vs {partido.equipoVisitanteNombre}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              className="min-w-[9.5rem]"
                              value={eff.fecha}
                              onChange={(e) =>
                                setSorteoDrafts((prev) => ({
                                  ...prev,
                                  [partido.id]: { ...eff, fecha: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={eff.canchaId || canchasActivas[0]?.id}
                              onValueChange={(v) =>
                                setSorteoDrafts((prev) => ({
                                  ...prev,
                                  [partido.id]: { ...eff, canchaId: v },
                                }))
                              }
                            >
                              <SelectTrigger className="min-w-[8rem]">
                                <SelectValue placeholder="Cancha" />
                              </SelectTrigger>
                              <SelectContent>
                                {canchasActivas.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={eff.hora || defaultHora}
                              onValueChange={(v) =>
                                setSorteoDrafts((prev) => ({
                                  ...prev,
                                  [partido.id]: { ...eff, hora: v },
                                }))
                              }
                            >
                              <SelectTrigger className="min-w-[6rem]">
                                <SelectValue placeholder="Hora" />
                              </SelectTrigger>
                              <SelectContent>
                                {horasActivas.map((h) => {
                                  const label = formatHoraUi(normalizeHoraDb(h.hora))
                                  return (
                                    <SelectItem key={h.id} value={label}>
                                      {label}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setProgPartido(partido)
                                setProgFecha(eff.fecha)
                                setProgHora(eff.hora || '09:00')
                                setProgCancha(eff.canchaId || canchasActivas[0]?.id || '')
                              }}
                            >
                              Manual
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="Nada pendiente en esta categoría"
                  description="Todos los partidos de la categoría elegida ya tienen programación, o aún no hay fixture."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fecha" className="space-y-4">
          {fechasOrdenadas.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sin partidos programados"
              description="Aún no hay partidos programados. Primero crea el fixture y luego asigna horarios."
            />
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
                        <CardDescription>{partidosFecha.length} partidos programados</CardDescription>
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
                                    <TeamAvatar
                                      nombre={partido.equipoLocalNombre}
                                      color={partido.categoriaColor}
                                      logoUrl={partido.equipoLocalLogoUrl}
                                      logoPublicId={partido.equipoLocalLogoPublicId}
                                    />
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
                                    <TeamAvatar
                                      nombre={partido.equipoVisitanteNombre}
                                      color="#64748b"
                                      logoUrl={partido.equipoVisitanteLogoUrl}
                                      logoPublicId={partido.equipoVisitanteLogoPublicId}
                                    />
                                    {partido.equipoVisitanteNombre}
                                  </div>
                                </TableCell>
                                <TableCell className={isConflict ? 'font-medium text-destructive' : ''}>
                                  {partido.cancha || '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={played ? 'default' : 'secondary'}>
                                    {played ? 'Jugado' : partido.estado || 'Programado'}
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
      </Tabs>
    </div>
  )
}
