import { useState } from 'react'
import { Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { categorias as categoriasData } from '@/data/mockData'
import { formatCurrency } from '@/lib/utils'

export function CategoriasPage() {
  const [categorias, setCategorias] = useState(categoriasData)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<typeof categoriasData[0] | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    rangoEdad: '',
    color: '#22c55e',
    valorInscripcion: 150000,
  })

  const handleOpenDialog = (categoria?: typeof categoriasData[0]) => {
    if (categoria) {
      setEditingCategoria(categoria)
      setFormData({
        nombre: categoria.nombre,
        rangoEdad: categoria.rangoEdad,
        color: categoria.color,
        valorInscripcion: categoria.valorInscripcion,
      })
    } else {
      setEditingCategoria(null)
      setFormData({
        nombre: '',
        rangoEdad: '',
        color: '#22c55e',
        valorInscripcion: 150000,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    // Simulated save
    setIsDialogOpen(false)
  }

  const handleToggleActive = (id: string) => {
    setCategorias(categorias.map(c => 
      c.id === id ? { ...c, activa: !c.activa } : c
    ))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Gestiona las categorías del torneo por rango de edad"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
                </DialogTitle>
                <DialogDescription>
                  {editingCategoria 
                    ? 'Modifica los datos de la categoría' 
                    : 'Agrega una nueva categoría al torneo'
                  }
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
                    <Label htmlFor="color">Color identificador</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        id="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-10 w-14 rounded border cursor-pointer"
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingCategoria ? 'Guardar Cambios' : 'Crear Categoría'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
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
            <p className="text-3xl font-bold text-primary">{categorias.filter(c => c.activa).length}</p>
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

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Categorías</CardTitle>
          <CardDescription>
            Administra las categorías del torneo, su estado y configuración
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell>{categoria.rangoEdad}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: categoria.color }}
                      />
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(categoria)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(categoria.id)}
                      >
                        {categoria.activa ? (
                          <PowerOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Power className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Se eliminarán todos los equipos, 
                              jugadores y partidos asociados a la categoría {categoria.nombre}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
        </CardContent>
      </Card>
    </div>
  )
}
