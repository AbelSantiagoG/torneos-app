import { useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCanchas } from '@/features/canchas/useCanchas'
import { useHorarios } from '@/features/horarios/useHorarios'
import { formatHoraUi } from '@/features/horarios/horariosService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Trophy,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Shield,
  Sun,
  Moon,
  Save,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Building,
} from 'lucide-react'

const usuariosMock = [
  { id: '1', nombre: 'Admin Principal', email: 'admin@torneo.com', rol: 'Administrador', estado: 'activo' },
  { id: '2', nombre: 'Coordinador', email: 'coord@torneo.com', rol: 'Coordinador', estado: 'activo' },
  { id: '3', nombre: 'Árbitro Jefe', email: 'arbitro@torneo.com', rol: 'Árbitro', estado: 'activo' },
];

const tarifasMock = [
  { concepto: 'Inscripción por equipo (base)', valor: 250000 },
  { concepto: 'Tarifa de arbitraje Sub-5/Sub-7', valor: 30000 },
  { concepto: 'Tarifa de arbitraje Sub-9/Sub-11', valor: 35000 },
  { concepto: 'Tarifa de arbitraje Sub-13+', valor: 40000 },
  { concepto: 'Multa por W.O.', valor: 50000 },
  { concepto: 'Multa por tarjeta roja', valor: 30000 },
];

export function ConfiguracionPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [canchaDialogOpen, setCanchaDialogOpen] = useState(false)
  const [horarioDialogOpen, setHorarioDialogOpen] = useState(false)
  const [usuarioDialogOpen, setUsuarioDialogOpen] = useState(false)

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const {
    data: canchas = [],
    isLoading: canchasLoading,
    createCancha,
    updateCancha,
    deleteCancha,
    isMutating: canchasMutating,
  } = useCanchas(torneoId)

  const {
    data: horarios = [],
    isLoading: horariosLoading,
    createHorario,
    updateHorario,
    deleteHorario,
    isMutating: horariosMutating,
  } = useHorarios(torneoId)

  const [canchaForm, setCanchaForm] = useState({ id: undefined as string | undefined, nombre: '', ubicacion: '', activa: true })
  const [horarioForm, setHorarioForm] = useState({ id: undefined as string | undefined, hora: '', activo: true })

  const openNewCancha = () => {
    setCanchaForm({ id: undefined, nombre: '', ubicacion: '', activa: true })
    setCanchaDialogOpen(true)
  }

  const openEditCancha = (c: (typeof canchas)[number]) => {
    setCanchaForm({
      id: c.id,
      nombre: c.nombre,
      ubicacion: c.ubicacion ?? '',
      activa: c.activa,
    })
    setCanchaDialogOpen(true)
  }

  const saveCancha = async () => {
    if (!torneoId) {
      toast.error('No hay torneo activo')
      return
    }
    if (!canchaForm.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    try {
      if (canchaForm.id) {
        await updateCancha({
          id: canchaForm.id,
          data: {
            nombre: canchaForm.nombre.trim(),
            ubicacion: canchaForm.ubicacion.trim() || null,
            activa: canchaForm.activa,
          },
        })
        toast.success('Cancha actualizada')
      } else {
        await createCancha({
          nombre: canchaForm.nombre.trim(),
          ubicacion: canchaForm.ubicacion.trim() || null,
          activa: canchaForm.activa,
        })
        toast.success('Cancha creada')
      }
      setCanchaDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar cancha')
    }
  }

  const removeCancha = async (id: string) => {
    try {
      await deleteCancha(id)
      toast.success('Cancha eliminada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  const openNewHorario = () => {
    setHorarioForm({ id: undefined, hora: '08:00', activo: true })
    setHorarioDialogOpen(true)
  }

  const openEditHorario = (h: (typeof horarios)[number]) => {
    setHorarioForm({ id: h.id, hora: formatHoraUi(h.hora), activo: h.activo })
    setHorarioDialogOpen(true)
  }

  const saveHorario = async () => {
    if (!torneoId) {
      toast.error('No hay torneo activo')
      return
    }
    if (!horarioForm.hora.trim()) {
      toast.error('La hora es obligatoria')
      return
    }
    try {
      if (horarioForm.id) {
        await updateHorario({
          id: horarioForm.id,
          data: { hora: horarioForm.hora, activo: horarioForm.activo },
        })
        toast.success('Horario actualizado')
      } else {
        await createHorario({ hora: horarioForm.hora, activo: horarioForm.activo })
        toast.success('Horario creado')
      }
      setHorarioDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar horario')
    }
  }

  const removeHorario = async (id: string) => {
    try {
      await deleteHorario(id)
      toast.success('Horario eliminado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Administra la configuración general del torneo"
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="canchas" className="gap-2">
            <MapPin className="h-4 w-4" />
            Canchas
          </TabsTrigger>
          <TabsTrigger value="horarios" className="gap-2">
            <Clock className="h-4 w-4" />
            Horarios
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Tarifas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="apariencia" className="gap-2">
            <Sun className="h-4 w-4" />
            Apariencia
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Datos del Torneo
              </CardTitle>
              <CardDescription>
                Información general y branding del torneo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!torneo && !torneoLoading ? (
                <EmptyState
                  icon={Trophy}
                  title="Sin torneo activo"
                  description="No hay torneo activo para mostrar datos generales."
                />
              ) : torneoLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Datos leídos desde Supabase. La edición del torneo se conectará en una fase posterior.
                  </p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombreTorneo">Nombre del Torneo</Label>
                      <Input id="nombreTorneo" value={torneo?.nombre ?? ''} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizacion">Organización</Label>
                      <Input id="organizacion" value={torneo?.organizacion ?? ''} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={torneo?.fecha_inicio ?? ''}
                        readOnly
                        className="bg-muted/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaFin">Fecha de Finalización</Label>
                      <Input id="fechaFin" type="date" value={torneo?.fecha_fin ?? ''} readOnly className="bg-muted/50" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <textarea
                      className="min-h-[100px] w-full rounded-md border bg-muted/50 px-3 py-2 text-sm"
                      value={torneo?.descripcion ?? ''}
                      readOnly
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <Button className="gap-2" type="button" disabled>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Datos de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" defaultValue="+57 300 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="contacto@torneo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" defaultValue="Calle 123 #45-67, Ciudad" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="web">Sitio Web</Label>
                  <Input id="web" defaultValue="www.torneo.com" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Canchas */}
        <TabsContent value="canchas" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Canchas Disponibles</CardTitle>
                <CardDescription>
                  Administra las canchas donde se juegan los partidos
                </CardDescription>
              </div>
              <Button onClick={openNewCancha} className="gap-2" disabled={!torneoId || canchasMutating}>
                <Plus className="h-4 w-4" />
                Nueva Cancha
              </Button>
            </CardHeader>
            <CardContent>
              {!torneoId ? (
                <EmptyState icon={MapPin} title="Sin torneo" description="Activa un torneo para gestionar canchas." />
              ) : canchasLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : canchas.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="Sin canchas"
                  description="Agrega la primera cancha del torneo."
                  action={
                    <Button onClick={openNewCancha}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva cancha
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {canchas.map((cancha) => (
                      <TableRow key={cancha.id}>
                        <TableCell className="font-medium">{cancha.nombre}</TableCell>
                        <TableCell>{cancha.ubicacion ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={cancha.activa ? 'default' : 'secondary'}>
                            {cancha.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditCancha(cancha)}
                              disabled={canchasMutating}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => void removeCancha(cancha.id)}
                              disabled={canchasMutating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Horarios */}
        <TabsContent value="horarios" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Horarios Predeterminados</CardTitle>
                <CardDescription>
                  Define los horarios disponibles para programar partidos
                </CardDescription>
              </div>
              <Button onClick={openNewHorario} className="gap-2" disabled={!torneoId || horariosMutating}>
                <Plus className="h-4 w-4" />
                Nuevo Horario
              </Button>
            </CardHeader>
            <CardContent>
              {!torneoId ? (
                <EmptyState icon={Clock} title="Sin torneo" description="Activa un torneo para gestionar horarios." />
              ) : horariosLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : horarios.length === 0 ? (
                <EmptyState
                  icon={Clock}
                  title="Sin horarios"
                  description="Los horarios en la base son franjas horarias (hora del día) disponibles para programar."
                  action={
                    <Button onClick={openNewHorario}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo horario
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {horarios.map((horario) => (
                      <TableRow key={horario.id}>
                        <TableCell className="font-medium">{formatHoraUi(horario.hora)}</TableCell>
                        <TableCell>
                          <Badge variant={horario.activo ? 'default' : 'secondary'}>
                            {horario.activo ? 'Sí' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditHorario(horario)}
                              disabled={horariosMutating}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => void removeHorario(horario.id)}
                              disabled={horariosMutating}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duración de Partidos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { cat: 'Sub-5', duracion: '20 min (2x10)' },
                  { cat: 'Sub-7', duracion: '30 min (2x15)' },
                  { cat: 'Sub-9', duracion: '40 min (2x20)' },
                  { cat: 'Sub-11', duracion: '50 min (2x25)' },
                  { cat: 'Sub-13', duracion: '60 min (2x30)' },
                  { cat: 'Sub-15', duracion: '70 min (2x35)' },
                  { cat: 'Sub-17', duracion: '80 min (2x40)' },
                ].map((item) => (
                  <div
                    key={item.cat}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="font-medium">{item.cat}</span>
                    <span className="text-muted-foreground">{item.duracion}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tarifas */}
        <TabsContent value="tarifas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarifas Generales</CardTitle>
              <CardDescription>
                Configura los valores de inscripción, arbitrajes y multas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarifasMock.map((tarifa, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{tarifa.concepto}</TableCell>
                      <TableCell className="text-right">
                        ${tarifa.valor.toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Tarifa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuarios */}
        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Usuarios y Seguridad
                </CardTitle>
                <CardDescription>
                  Administra los usuarios con acceso al sistema
                </CardDescription>
              </div>
              <Button onClick={() => setUsuarioDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosMock.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.nombre}</TableCell>
                      <TableCell>{usuario.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{usuario.rol}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apariencia */}
        <TabsContent value="apariencia" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tema de la Aplicación</CardTitle>
              <CardDescription>
                Personaliza la apariencia visual del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {darkMode ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                  <div>
                    <p className="font-medium">Modo Oscuro</p>
                    <p className="text-sm text-muted-foreground">
                      Cambia entre tema claro y oscuro
                    </p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>

              <div className="space-y-3">
                <Label>Color Principal</Label>
                <div className="flex gap-3">
                  {[
                    { name: 'Verde', color: 'bg-green-600' },
                    { name: 'Azul', color: 'bg-blue-600' },
                    { name: 'Índigo', color: 'bg-indigo-600' },
                    { name: 'Púrpura', color: 'bg-purple-600' },
                    { name: 'Rojo', color: 'bg-red-600' },
                  ].map((c) => (
                    <button
                      key={c.name}
                      className={`h-10 w-10 rounded-full ${c.color} ring-2 ring-offset-2 ring-transparent hover:ring-primary transition-all`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Nueva Cancha */}
      <Dialog open={canchaDialogOpen} onOpenChange={setCanchaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{canchaForm.id ? 'Editar cancha' : 'Nueva cancha'}</DialogTitle>
            <DialogDescription>Datos de la cancha en el torneo activo</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombreCancha">Nombre</Label>
              <Input
                id="nombreCancha"
                placeholder="Ej: Cancha Principal"
                value={canchaForm.nombre}
                onChange={(e) => setCanchaForm({ ...canchaForm, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacionCancha">Ubicación</Label>
              <Input
                id="ubicacionCancha"
                placeholder="Ej: Sede Central"
                value={canchaForm.ubicacion}
                onChange={(e) => setCanchaForm({ ...canchaForm, ubicacion: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activa</p>
                <p className="text-xs text-muted-foreground">Disponible para programación</p>
              </div>
              <Switch checked={canchaForm.activa} onCheckedChange={(v) => setCanchaForm({ ...canchaForm, activa: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCanchaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveCancha()} disabled={canchasMutating}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Horario */}
      <Dialog open={horarioDialogOpen} onOpenChange={setHorarioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{horarioForm.id ? 'Editar horario' : 'Nuevo horario'}</DialogTitle>
            <DialogDescription>
              Franja horaria disponible (coincide con el campo <code className="text-xs">hora</code> en Supabase).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="horaFranja">Hora</Label>
              <Input
                id="horaFranja"
                type="time"
                value={horarioForm.hora}
                onChange={(e) => setHorarioForm({ ...horarioForm, hora: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Se muestra en listas de programación</p>
              </div>
              <Switch checked={horarioForm.activo} onCheckedChange={(v) => setHorarioForm({ ...horarioForm, activo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHorarioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveHorario()} disabled={horariosMutating}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Usuario */}
      <Dialog open={usuarioDialogOpen} onOpenChange={setUsuarioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Agrega un nuevo usuario al sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombreUsuario">Nombre</Label>
              <Input id="nombreUsuario" placeholder="Nombre completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailUsuario">Email</Label>
              <Input id="emailUsuario" type="email" placeholder="correo@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rolUsuario">Rol</Label>
              <Input id="rolUsuario" placeholder="Administrador, Coordinador, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsuarioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setUsuarioDialogOpen(false)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
