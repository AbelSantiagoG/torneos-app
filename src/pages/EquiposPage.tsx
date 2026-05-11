import { useEffect, useMemo, useState } from 'react'
import { Plus, Upload, Users, Edit, Trash2, AlertCircle, CheckCircle, Search, UserPlus, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { useEquipos } from '@/features/equipos/useEquipos'
import { useJugadores } from '@/features/jugadores/useJugadores'
import { useJugadoresPorCategoria } from '@/features/jugadores/useJugadoresPorCategoria'
import type { Equipo } from '@/types/torneo'

export function EquiposPage() {
  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)

  const [selectedCategoria, setSelectedCategoria] = useState<string>('')
  useEffect(() => {
    if (!selectedCategoria && categorias.length > 0) {
      const firstActive = categorias.find((c) => c.activa)?.id ?? categorias[0]!.id
      setSelectedCategoria(firstActive)
    }
  }, [categorias, selectedCategoria])

  const {
    data: equiposLista = [],
    isLoading: eqLoading,
    createEquipo,
    updateEquipo,
    deleteEquipo,
    isMutating: eqMutating,
  } = useEquipos(selectedCategoria || undefined, torneoId)

  const { data: jugadoresCategoria = [], isLoading: jugCatLoading } = useJugadoresPorCategoria(
    selectedCategoria || undefined,
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null)
  const [teamForm, setTeamForm] = useState({ nombre: '', sigla: '', color: '#dc2626', categoriaId: '' })

  const [isPlayersSheetOpen, setIsPlayersSheetOpen] = useState(false)
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null)

  const {
    data: jugadoresEquipo = [],
    createJugador,
    cambiarJugadorDeEquipo,
    desactivarJugador,
    isMutating: jugMutating,
  } = useJugadores(selectedEquipo?.id, selectedCategoria || undefined)

  const [playerForm, setPlayerForm] = useState({ nombreCompleto: '', documento: '', anioNacimiento: '' })
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<{ jugadorId: string; nombre: string } | null>(null)
  const [transferEquipoId, setTransferEquipoId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')

  const filteredEquipos = useMemo(
    () => equiposLista.filter((e) => e.nombre.toLowerCase().includes(searchQuery.toLowerCase())),
    [equiposLista, searchQuery],
  )

  const openTeamDialog = (equipo?: Equipo) => {
    if (equipo) {
      setEditingEquipo(equipo)
      setTeamForm({
        nombre: equipo.nombre,
        sigla: equipo.sigla ?? '',
        color: equipo.color,
        categoriaId: equipo.categoriaId,
      })
    } else {
      setEditingEquipo(null)
      setTeamForm({
        nombre: '',
        sigla: '',
        color: '#dc2626',
        categoriaId: selectedCategoria,
      })
    }
    setIsTeamDialogOpen(true)
  }

  const saveTeam = async () => {
    if (!torneoId) {
      toast.error('No hay torneo activo')
      return
    }
    if (!teamForm.nombre.trim()) {
      toast.error('El nombre del equipo es obligatorio')
      return
    }
    const catId = teamForm.categoriaId || selectedCategoria
    if (!catId) {
      toast.error('Selecciona una categoría')
      return
    }
    try {
      if (editingEquipo) {
        await updateEquipo({
          id: editingEquipo.id,
          data: {
            nombre: teamForm.nombre.trim(),
            sigla: teamForm.sigla.trim() || null,
            color: teamForm.color,
          },
        })
        toast.success('Equipo actualizado')
      } else {
        await createEquipo({
          categoriaId: catId,
          data: {
            nombre: teamForm.nombre.trim(),
            sigla: teamForm.sigla.trim() || null,
            color: teamForm.color,
          },
        })
        toast.success('Equipo creado')
      }
      setIsTeamDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar equipo')
    }
  }

  const handleDeleteEquipo = async (id: string) => {
    try {
      await deleteEquipo(id)
      toast.success('Equipo eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el equipo')
    }
  }

  const openPlayersSheet = (equipo: Equipo) => {
    setSelectedEquipo(equipo)
    setIsPlayersSheetOpen(true)
    setPlayerForm({ nombreCompleto: '', documento: '', anioNacimiento: '' })
  }

  const savePlayer = async () => {
    if (!selectedEquipo) return
    if (!playerForm.nombreCompleto.trim()) {
      toast.error('El nombre completo es obligatorio')
      return
    }
    try {
      await createJugador({
        nombre_completo: playerForm.nombreCompleto.trim(),
        documento: playerForm.documento.trim() || null,
        anio_nacimiento: playerForm.anioNacimiento.trim() ? Number(playerForm.anioNacimiento) : null,
      })
      toast.success('Jugador registrado')
      setPlayerDialogOpen(false)
      setPlayerForm({ nombreCompleto: '', documento: '', anioNacimiento: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al crear jugador')
    }
  }

  const openTransfer = (jugadorId: string, nombre: string) => {
    setTransferTarget({ jugadorId, nombre })
    setTransferEquipoId('')
    setTransferMotivo('')
    setTransferDialogOpen(true)
  }

  const saveTransfer = async () => {
    if (!transferTarget || !transferEquipoId) {
      toast.error('Selecciona equipo destino')
      return
    }
    if (transferEquipoId === selectedEquipo?.id) {
      toast.error('Elige un equipo distinto al actual')
      return
    }
    try {
      await cambiarJugadorDeEquipo({
        jugadorId: transferTarget.jugadorId,
        equipoNuevoId: transferEquipoId,
        motivo: transferMotivo.trim() || 'Cambio de equipo',
      })
      toast.success('Jugador transferido')
      setTransferDialogOpen(false)
      setTransferTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al transferir')
    }
  }

  const handleDeactivatePlayer = async (jugadorId: string) => {
    try {
      await desactivarJugador(jugadorId)
      toast.success('Jugador desactivado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al desactivar')
    }
  }

  const loading = torneoLoading || catLoading
  const catNombre = categorias.find((c) => c.id === selectedCategoria)?.nombre ?? ''

  if (!torneoLoading && !torneo) {
    return (
      <div className="space-y-6">
        <PageHeader title="Equipos y Jugadores" description="Gestiona equipos y jugadores por categoría" />
        <EmptyState
          icon={Users}
          title="Sin torneo activo"
          description="No hay torneo activo. Configura un torneo en Supabase para gestionar equipos."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipos y Jugadores"
        description="Gestiona los equipos inscritos y sus jugadores por categoría"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" type="button">
              <Upload className="mr-2 h-4 w-4" />
              Importar desde Excel
            </Button>
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openTeamDialog()} disabled={!selectedCategoria || eqMutating}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Equipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEquipo ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
                  <DialogDescription>
                    {editingEquipo ? 'Modifica los datos del equipo' : 'Agrega un equipo a la categoría seleccionada'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Nombre del equipo</Label>
                    <Input
                      id="teamName"
                      placeholder="Ej: Deportivo Águilas"
                      value={teamForm.nombre}
                      onChange={(e) => setTeamForm({ ...teamForm, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select
                      value={teamForm.categoriaId}
                      onValueChange={(v) => setTeamForm({ ...teamForm, categoriaId: v })}
                      disabled={Boolean(editingEquipo)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias
                          .filter((c) => c.activa)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nombre} ({cat.rangoEdad})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="teamColor">Color del equipo</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="teamColor"
                          value={teamForm.color}
                          onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                          className="h-10 w-14 cursor-pointer rounded border"
                        />
                        <Input
                          value={teamForm.color}
                          onChange={(e) => setTeamForm({ ...teamForm, color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamSigla">Sigla</Label>
                      <Input
                        id="teamSigla"
                        placeholder="Ej: DA"
                        maxLength={6}
                        value={teamForm.sigla}
                        onChange={(e) => setTeamForm({ ...teamForm, sigla: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void saveTeam()} disabled={eqMutating}>
                    {editingEquipo ? 'Guardar' : 'Crear Equipo'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Label className="mb-2 block text-xs text-muted-foreground">Categoría</Label>
              {loading ? (
                <Skeleton className="h-10 w-full md:w-64" />
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
                          {cat.nombre} ({cat.rangoEdad})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex-1">
              <Label className="mb-2 block text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipo…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {eqLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredEquipos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay equipos en esta categoría"
          description="Agrega el primer equipo a esta categoría para comenzar a gestionar jugadores."
          action={
            <Button onClick={() => openTeamDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Equipo
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEquipos.map((equipo) => {
            const advertencias = 0

            return (
              <Card key={equipo.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                        style={{ backgroundColor: equipo.color }}
                      >
                        {equipo.logoPlaceholder}
                      </div>
                      <div>
                        <CardTitle className="text-base">{equipo.nombre}</CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {equipo.jugadores} jugadores
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-4 flex items-center justify-between">
                    <Badge variant={equipo.inscripcionPagada ? 'default' : 'destructive'}>
                      {equipo.inscripcionPagada ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Inscripción pagada
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Pago pendiente
                        </>
                      )}
                    </Badge>
                    {advertencias > 0 && (
                      <Badge variant="outline" className="border-warning text-warning-foreground">
                        {advertencias} advertencias
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => openPlayersSheet(equipo)}>
                      <Users className="mr-2 h-4 w-4" />
                      Jugadores
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openTeamDialog(equipo)} disabled={eqMutating}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={eqMutating}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar equipo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se eliminará {equipo.nombre}. No podrás deshacer esta acción si hay restricciones en la base
                            de datos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleDeleteEquipo(equipo.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Todos los Jugadores — {catNombre || 'Categoría'}</CardTitle>
          <CardDescription>Vista de tabla con todos los jugadores activos de la categoría seleccionada</CardDescription>
        </CardHeader>
        <CardContent>
          {jugCatLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : jugadoresCategoria.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin jugadores"
              description="No hay jugadores con membresía activa en esta categoría."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Año Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jugadoresCategoria.map((jugador) => (
                  <TableRow key={jugador.id}>
                    <TableCell className="font-medium">{jugador.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: jugador.equipoColor }} />
                        {jugador.equipoNombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{jugador.documento}</TableCell>
                    <TableCell>{jugador.anioNacimiento}</TableCell>
                    <TableCell>
                      {jugador.estado === 'activo' ? (
                        <Badge variant="outline" className="border-success text-success">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Activo
                        </Badge>
                      ) : jugador.estado === 'advertencia' ? (
                        <Badge variant="outline" className="border-warning text-warning-foreground">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          {jugador.advertencia ?? 'Atención'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={isPlayersSheetOpen}
        onOpenChange={(open) => {
          setIsPlayersSheetOpen(open)
          if (!open) setSelectedEquipo(null)
        }}
      >
        <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: selectedEquipo?.color }}
              >
                {selectedEquipo?.logoPlaceholder}
              </div>
              <div>
                <SheetTitle>{selectedEquipo?.nombre}</SheetTitle>
                <SheetDescription>Gestión de jugadores del equipo</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-6 flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{jugadoresEquipo.length} jugadores activos</h4>
              <Button size="sm" onClick={() => setPlayerDialogOpen(true)} disabled={jugMutating}>
                <UserPlus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>
            <Dialog open={playerDialogOpen} onOpenChange={setPlayerDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo jugador</DialogTitle>
                  <DialogDescription>Se asociará a {selectedEquipo?.nombre}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>Nombre completo</Label>
                    <Input
                      value={playerForm.nombreCompleto}
                      onChange={(e) => setPlayerForm({ ...playerForm, nombreCompleto: e.target.value })}
                      placeholder="Nombre y apellidos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Documento (opcional)</Label>
                    <Input
                      value={playerForm.documento}
                      onChange={(e) => setPlayerForm({ ...playerForm, documento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Año de nacimiento (opcional)</Label>
                    <Input
                      type="number"
                      value={playerForm.anioNacimiento}
                      onChange={(e) => setPlayerForm({ ...playerForm, anioNacimiento: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPlayerDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void savePlayer()} disabled={jugMutating}>
                    Guardar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cambiar de equipo</DialogTitle>
                  <DialogDescription>Jugador: {transferTarget?.nombre}</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>Equipo destino</Label>
                    <Select value={transferEquipoId} onValueChange={setTransferEquipoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {equiposLista
                          .filter((e) => e.id !== selectedEquipo?.id)
                          .map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nombre}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo</Label>
                    <Input value={transferMotivo} onChange={(e) => setTransferMotivo(e.target.value)} placeholder="Opcional" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void saveTransfer()} disabled={jugMutating}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transferir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Año Nac.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jugadoresEquipo.map((jugador) => (
                    <TableRow key={jugador.id}>
                      <TableCell className="font-medium">{jugador.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{jugador.documento}</TableCell>
                      <TableCell>{jugador.anioNacimiento}</TableCell>
                      <TableCell>
                        {jugador.estado === 'activo' ? (
                          <Badge variant="outline" className="border-success text-success">
                            Activo
                          </Badge>
                        ) : jugador.estado === 'advertencia' ? (
                          <Badge variant="outline" className="border-warning text-warning-foreground">
                            {jugador.advertencia}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openTransfer(jugador.id, jugador.nombre)}>
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() => void handleDeactivatePlayer(jugador.id)}
                          disabled={jugMutating}
                        >
                          Desactivar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
