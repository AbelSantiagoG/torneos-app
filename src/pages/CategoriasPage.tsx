import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Power, PowerOff, Layers, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { CrearTorneoDialog } from '@/components/torneos/CrearTorneoDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { translateUserError } from '@/lib/errorMessages'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import type { Categoria, FormatoCompetenciaUi } from '@/types/torneo'

const FORMATO_LABELS: Record<FormatoCompetenciaUi, string> = {
  todos_contra_todos: 'Todos contra todos',
  fase_grupos: 'Fase de grupos',
  eliminatoria: 'Eliminatoria',
}

export function CategoriasPage() {
  const { data: torneo, isLoading: torneoLoading, error: torneoError, torneos } = useTorneoActivo()
  const torneoId = torneo?.id

  const [crearTorneoOpen, setCrearTorneoOpen] = useState(false)

  const {
    data: categorias = [],
    isLoading: catLoading,
    error: catError,
    createCategoria,
    updateCategoria,
    toggleCategoria,
    deleteCategoria,
    isMutating,
  } = useCategorias(torneoId)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    rangoEdad: '',
    color: '#22c55e',
    valorInscripcion: 150000,
    tarifaArbitraje: 0,
    edadMin: '' as string,
    edadMax: '' as string,
    formato: 'todos_contra_todos' as FormatoCompetenciaUi,
  })

  useEffect(() => {
    if (torneoError) {
      toast.error(torneoError instanceof Error ? torneoError.message : 'No se pudo cargar el torneo')
    }
  }, [torneoError])

  useEffect(() => {
    if (catError) {
      toast.error(catError instanceof Error ? catError.message : 'No se pudieron cargar las categorías')
    }
  }, [catError])

  const handleOpenDialog = (categoria?: Categoria) => {
    if (categoria) {
      setEditingCategoria(categoria)
      setFormData({
        nombre: categoria.nombre,
        rangoEdad: categoria.rangoEdad,
        color: categoria.color,
        valorInscripcion: categoria.valorInscripcion,
        tarifaArbitraje: categoria.tarifaArbitraje,
        edadMin: categoria.edadMin != null ? String(categoria.edadMin) : '',
        edadMax: categoria.edadMax != null ? String(categoria.edadMax) : '',
        formato: categoria.formato ?? 'todos_contra_todos',
      })
    } else {
      setEditingCategoria(null)
      setFormData({
        nombre: '',
        rangoEdad: '',
        color: '#22c55e',
        valorInscripcion: 150000,
        tarifaArbitraje: 0,
        edadMin: '',
        edadMax: '',
        formato: 'todos_contra_todos',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!torneoId) {
      toast.error('No hay torneo activo')
      return
    }
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    if (!formData.edadMin.trim() || !formData.edadMax.trim()) {
      toast.error('La edad mínima y la edad máxima son obligatorias.')
      return
    }
    const edadMin = Number(formData.edadMin)
    const edadMax = Number(formData.edadMax)
    if (Number.isNaN(edadMin) || Number.isNaN(edadMax)) {
      toast.error('Las edades deben ser números válidos.')
      return
    }
    if (edadMin > edadMax) {
      toast.error('La edad mínima no puede ser mayor que la edad máxima.')
      return
    }
    if (!formData.color?.trim()) {
      toast.error('El color es obligatorio.')
      return
    }
    if (Number.isNaN(formData.valorInscripcion) || formData.valorInscripcion < 0) {
      toast.error('El valor de inscripción es obligatorio y debe ser un número válido.')
      return
    }
    if (Number.isNaN(formData.tarifaArbitraje) || formData.tarifaArbitraje < 0) {
      toast.error('La tarifa de arbitraje es obligatoria (puede ser 0).')
      return
    }
    const formatoKeys: FormatoCompetenciaUi[] = ['todos_contra_todos', 'fase_grupos', 'eliminatoria']
    if (!formatoKeys.includes(formData.formato)) {
      toast.error('Selecciona un formato de competencia válido.')
      return
    }
    try {
      if (editingCategoria) {
        await updateCategoria({
          id: editingCategoria.id,
          data: {
            nombre: formData.nombre.trim(),
            rango_edad: formData.rangoEdad.trim() || null,
            color: formData.color,
            valor_inscripcion: formData.valorInscripcion,
            tarifa_arbitraje: formData.tarifaArbitraje,
            edad_min: edadMin,
            edad_max: edadMax,
            formato: formData.formato,
          },
        })
        toast.success('Categoría actualizada')
      } else {
        await createCategoria({
          nombre: formData.nombre.trim(),
          rango_edad: formData.rangoEdad.trim() || null,
          color: formData.color,
          valor_inscripcion: formData.valorInscripcion,
          tarifa_arbitraje: formData.tarifaArbitraje,
          edad_min: edadMin,
          edad_max: edadMax,
          formato: formData.formato,
        })
        toast.success('Categoría creada')
      }
      setIsDialogOpen(false)
    } catch (e) {
      toast.error(translateUserError(e, 'categoria'))
    }
  }

  const handleToggleActive = async (c: Categoria) => {
    try {
      await toggleCategoria({ id: c.id, activa: !c.activa })
      toast.success(c.activa ? 'Categoría desactivada' : 'Categoría activada')
    } catch (e) {
      toast.error(translateUserError(e, 'categoria'))
    }
  }

  const handleDelete = async (c: Categoria) => {
    try {
      await deleteCategoria(c.id)
      toast.success('Categoría eliminada')
    } catch (e) {
      toast.error(translateUserError(e, 'categoria'))
    }
  }

  const loading = torneoLoading || catLoading

  if (!torneoLoading && torneos.length === 0) {
    return (
      <div className="space-y-6">
        <CrearTorneoDialog open={crearTorneoOpen} onOpenChange={setCrearTorneoOpen} />
        <PageHeader title="Categorías" description="Gestiona las categorías del torneo por rango de edad" />
        <EmptyState
          icon={Trophy}
          title="Crea tu primer torneo"
          description="Necesitas al menos un torneo para administrar categorías."
          action={
            <Button type="button" onClick={() => setCrearTorneoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo torneo
            </Button>
          }
        />
      </div>
    )
  }

  if (!torneoLoading && !torneo) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categorías" description="Gestiona las categorías del torneo por rango de edad" />
        <EmptyState
          icon={Trophy}
          title="Sin torneo activo"
          description="No hay un torneo con estado activo en Supabase. Crea uno o marca un torneo como activo para continuar."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CrearTorneoDialog open={crearTorneoOpen} onOpenChange={setCrearTorneoOpen} />
      <PageHeader
        title="Categorías"
        description="Gestiona las categorías del torneo por rango de edad"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} disabled={!torneoId || isMutating}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                <DialogDescription>
                  {editingCategoria ? 'Modifica los datos de la categoría' : 'Agrega una nueva categoría al torneo'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre de la categoría</Label>
                  <Input
                    id="nombre"
                    placeholder="Ej: Sub-7"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rangoEdad">Rango de edad</Label>
                  <Input
                    id="rangoEdad"
                    placeholder="Ej: 6-7 años"
                    value={formData.rangoEdad}
                    onChange={(e) => setFormData({ ...formData, rangoEdad: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edadMin">Edad mínima</Label>
                    <Input
                      id="edadMin"
                      type="number"
                      value={formData.edadMin}
                      onChange={(e) => setFormData({ ...formData, edadMin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edadMax">Edad máxima</Label>
                    <Input
                      id="edadMax"
                      type="number"
                      value={formData.edadMax}
                      onChange={(e) => setFormData({ ...formData, edadMax: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color identificador</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded border"
                      />
                      <Input
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorInscripcion">Valor de inscripción</Label>
                    <Input
                      id="valorInscripcion"
                      type="number"
                      value={formData.valorInscripcion}
                      onChange={(e) => setFormData({ ...formData, valorInscripcion: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tarifaArbitraje">Tarifa arbitraje</Label>
                  <Input
                    id="tarifaArbitraje"
                    type="number"
                    value={formData.tarifaArbitraje}
                    onChange={(e) => setFormData({ ...formData, tarifaArbitraje: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formato">Formato de competencia</Label>
                  <Select
                    value={formData.formato}
                    onValueChange={(v) =>
                      setFormData({ ...formData, formato: v as FormatoCompetenciaUi })
                    }
                  >
                    <SelectTrigger id="formato" className="w-full">
                      <SelectValue placeholder="Selecciona formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos_contra_todos">
                        {FORMATO_LABELS.todos_contra_todos}
                      </SelectItem>
                      <SelectItem value="fase_grupos">{FORMATO_LABELS.fase_grupos}</SelectItem>
                      <SelectItem value="eliminatoria">{FORMATO_LABELS.eliminatoria}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isMutating}>
                  {editingCategoria ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Categorías</p>
              <p className="text-3xl font-bold">{categorias.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Categorías Activas</p>
              <p className="text-3xl font-bold text-primary">{categorias.filter((c) => c.activa).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Equipos</p>
              <p className="text-3xl font-bold">{categorias.reduce((acc, c) => acc + c.equipos, 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Partidos</p>
              <p className="text-3xl font-bold">{categorias.reduce((acc, c) => acc + c.partidos, 0)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorías</CardTitle>
          <CardDescription>Administra las categorías del torneo, su estado y configuración</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : categorias.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Sin categorías"
              description="Este torneo aún no tiene categorías. Crea la primera para empezar a registrar equipos y partidos."
              action={
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera categoría
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Rango de Edad</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Valor Inscripción</TableHead>
                  <TableHead className="text-center">Equipos</TableHead>
                  <TableHead className="text-center">Partidos</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">{categoria.nombre}</TableCell>
                    <TableCell>{categoria.rangoEdad || '—'}</TableCell>
                    <TableCell>{FORMATO_LABELS[categoria.formato] ?? categoria.formato}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: categoria.color }} />
                        <span className="text-xs text-muted-foreground">{categoria.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(categoria.valorInscripcion)}</TableCell>
                    <TableCell className="text-center">{categoria.equipos}</TableCell>
                    <TableCell className="text-center">{categoria.partidos}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={categoria.activa ? 'default' : 'secondary'}>
                        {categoria.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(categoria)} disabled={isMutating}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void handleToggleActive(categoria)}
                          disabled={isMutating}
                        >
                          {categoria.activa ? (
                            <PowerOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Power className="h-4 w-4 text-primary" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isMutating}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción puede fallar si existen equipos u otros registros ligados a {categoria.nombre}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => void handleDelete(categoria)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
