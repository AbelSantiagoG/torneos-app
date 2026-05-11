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
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import type { Categoria } from '@/types/torneo'

export function CategoriasPage() {
  const { data: torneo, isLoading: torneoLoading, error: torneoError } = useTorneoActivo()
  const torneoId = torneo?.id

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
    const edadMin = formData.edadMin.trim() ? Number(formData.edadMin) : null
    const edadMax = formData.edadMax.trim() ? Number(formData.edadMax) : null
    if (formData.edadMin.trim() && Number.isNaN(edadMin)) {
      toast.error('Edad mínima inválida')
      return
    }
    if (formData.edadMax.trim() && Number.isNaN(edadMax)) {
      toast.error('Edad máxima inválida')
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
        })
        toast.success('Categoría creada')
      }
      setIsDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    }
  }

  const handleToggleActive = async (c: Categoria) => {
    try {
      await toggleCategoria({ id: c.id, activa: !c.activa })
      toast.success(c.activa ? 'Categoría desactivada' : 'Categoría activada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  const handleDelete = async (c: Categoria) => {
    try {
      await deleteCategoria(c.id)
      toast.success('Categoría eliminada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar (¿hay equipos asociados?)')
    }
  }

  const loading = torneoLoading || catLoading

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
                    <Label htmlFor="edadMin">Edad mínima (opcional)</Label>
                    <Input
                      id="edadMin"
                      type="number"
                      value={formData.edadMin}
                      onChange={(e) => setFormData({ ...formData, edadMin: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edadMax">Edad máxima (opcional)</Label>
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
              description="Aún no hay categorías para este torneo. Crea la primera con el botón superior."
              action={
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva categoría
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Rango de Edad</TableHead>
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
