import { useState } from 'react'
import { Plus, Upload, Users, Edit, Trash2, AlertCircle, CheckCircle, Search } from 'lucide-react'
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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
import { 
  categorias, 
  equipos, 
  getEquiposByCategoriaId,
  getJugadoresByEquipoId,
} from '@/data/mockData'
import type { Equipo, Jugador } from '@/types/torneo'

export function EquiposPage() {
  const [selectedCategoria, setSelectedCategoria] = useState(categorias[1].id) // Sub-7
  const [searchQuery, setSearchQuery] = useState('')
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false)
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null)
  const [isPlayersSheetOpen, setIsPlayersSheetOpen] = useState(false)

  const equiposCategoria = getEquiposByCategoriaId(selectedCategoria)
  const filteredEquipos = equiposCategoria.filter(e => 
    e.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenPlayersSheet = (equipo: Equipo) => {
    setSelectedEquipo(equipo)
    setIsPlayersSheetOpen(true)
  }

  const jugadoresEquipo = selectedEquipo ? getJugadoresByEquipoId(selectedEquipo.id) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipos y Jugadores"
        description="Gestiona los equipos inscritos y sus jugadores por categoría"
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar desde Excel
            </Button>
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Equipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo Equipo</DialogTitle>
                  <DialogDescription>
                    Agrega un nuevo equipo a la categoría seleccionada
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="teamName">Nombre del equipo</Label>
                    <Input id="teamName" placeholder="Ej: Deportivo Águilas" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamCategory">Categoría</Label>
                    <Select defaultValue={selectedCategoria}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.filter(c => c.activa).map(cat => (
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
                          defaultValue="#dc2626"
                          className="h-10 w-14 rounded border cursor-pointer"
                        />
                        <Input defaultValue="#dc2626" className="flex-1" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teamInitials">Iniciales (logo)</Label>
                      <Input id="teamInitials" placeholder="Ej: DA" maxLength={2} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsTeamDialogOpen(false)}>
                    Crear Equipo
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Categoría</Label>
              <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.nombre} ({cat.rangoEdad})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      {filteredEquipos.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay equipos en esta categoría"
          description="Agrega el primer equipo a esta categoría para comenzar a gestionar jugadores y partidos."
          action={
            <Button onClick={() => setIsTeamDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Equipo
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEquipos.map((equipo) => {
            const jugadores = getJugadoresByEquipoId(equipo.id)
            const advertencias = jugadores.filter(j => j.estado === 'advertencia').length

            return (
              <Card key={equipo.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-white font-bold text-lg"
                        style={{ backgroundColor: equipo.color }}
                      >
                        {equipo.logoPlaceholder}
                      </div>
                      <div>
                        <CardTitle className="text-base">{equipo.nombre}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {equipo.jugadores} jugadores
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-4">
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
                      <Badge variant="outline" className="text-warning-foreground border-warning">
                        {advertencias} advertencias
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Sheet open={isPlayersSheetOpen && selectedEquipo?.id === equipo.id} onOpenChange={setIsPlayersSheetOpen}>
                      <SheetTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleOpenPlayersSheet(equipo)}
                        >
                          <Users className="mr-2 h-4 w-4" />
                          Jugadores
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:max-w-xl">
                        <SheetHeader>
                          <div className="flex items-center gap-3">
                            <div 
                              className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold"
                              style={{ backgroundColor: selectedEquipo?.color }}
                            >
                              {selectedEquipo?.logoPlaceholder}
                            </div>
                            <div>
                              <SheetTitle>{selectedEquipo?.nombre}</SheetTitle>
                              <SheetDescription>
                                Gestión de jugadores del equipo
                              </SheetDescription>
                            </div>
                          </div>
                        </SheetHeader>
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-medium">
                              {jugadoresEquipo.length} jugadores registrados
                            </h4>
                            <Button size="sm">
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar
                            </Button>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Año Nac.</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {jugadoresEquipo.map((jugador) => (
                                <TableRow key={jugador.id}>
                                  <TableCell className="font-medium">{jugador.nombre}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    {jugador.documento}
                                  </TableCell>
                                  <TableCell>{jugador.anioNacimiento}</TableCell>
                                  <TableCell>
                                    {jugador.estado === 'activo' ? (
                                      <Badge variant="outline" className="text-success border-success">
                                        Activo
                                      </Badge>
                                    ) : jugador.estado === 'advertencia' ? (
                                      <Badge variant="outline" className="text-warning-foreground border-warning">
                                        {jugador.advertencia}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">Inactivo</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </SheetContent>
                    </Sheet>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Players Table View */}
      <Card>
        <CardHeader>
          <CardTitle>Todos los Jugadores - {categorias.find(c => c.id === selectedCategoria)?.nombre}</CardTitle>
          <CardDescription>
            Vista de tabla con todos los jugadores de la categoría seleccionada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jugador</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Año Nacimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equiposCategoria.flatMap(equipo => 
                getJugadoresByEquipoId(equipo.id).map(jugador => (
                  <TableRow key={jugador.id}>
                    <TableCell className="font-medium">{jugador.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: equipo.color }}
                        />
                        {equipo.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{jugador.documento}</TableCell>
                    <TableCell>{jugador.anioNacimiento}</TableCell>
                    <TableCell>
                      {jugador.estado === 'activo' ? (
                        <Badge variant="outline" className="text-success border-success">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Activo
                        </Badge>
                      ) : jugador.estado === 'advertencia' ? (
                        <Badge variant="outline" className="text-warning-foreground border-warning">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Advertencia
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
