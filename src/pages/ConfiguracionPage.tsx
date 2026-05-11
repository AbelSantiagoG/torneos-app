import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
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
} from 'lucide-react';

const canchasMock = [
  { id: '1', nombre: 'Cancha Principal', ubicacion: 'Sede Central', capacidad: 200, estado: 'activa' },
  { id: '2', nombre: 'Cancha Auxiliar 1', ubicacion: 'Sede Central', capacidad: 100, estado: 'activa' },
  { id: '3', nombre: 'Cancha Auxiliar 2', ubicacion: 'Sede Norte', capacidad: 80, estado: 'activa' },
  { id: '4', nombre: 'Cancha Sintética', ubicacion: 'Complejo Deportivo', capacidad: 150, estado: 'mantenimiento' },
];

const horariosMock = [
  { id: '1', dia: 'Sábado', horaInicio: '08:00', horaFin: '18:00', intervalo: 60 },
  { id: '2', dia: 'Domingo', horaInicio: '08:00', horaFin: '16:00', intervalo: 60 },
];

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
  const [darkMode, setDarkMode] = useState(false);
  const [canchaDialogOpen, setCanchaDialogOpen] = useState(false);
  const [horarioDialogOpen, setHorarioDialogOpen] = useState(false);
  const [usuarioDialogOpen, setUsuarioDialogOpen] = useState(false);

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
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombreTorneo">Nombre del Torneo</Label>
                  <Input
                    id="nombreTorneo"
                    defaultValue="Copa Primavera 2024"
                    placeholder="Ej: Copa Verano 2024"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizacion">Organización</Label>
                  <Input
                    id="organizacion"
                    defaultValue="Liga Infantil de Fútbol"
                    placeholder="Nombre de la organización"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                  <Input id="fechaInicio" type="date" defaultValue="2024-03-01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha de Finalización</Label>
                  <Input id="fechaFin" type="date" defaultValue="2024-06-30" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Logo del Torneo</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
                    <Trophy className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline" className="gap-2">
                      <Upload className="h-4 w-4" />
                      Subir Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG o SVG. Máximo 2MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Descripción breve del torneo..."
                  defaultValue="Torneo de fútbol infantil para categorías Sub-5 a Sub-17. Organizado por la Liga Infantil de Fútbol."
                />
              </div>

              <div className="flex justify-end">
                <Button className="gap-2">
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
              <Button onClick={() => setCanchaDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Cancha
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Capacidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canchasMock.map((cancha) => (
                    <TableRow key={cancha.id}>
                      <TableCell className="font-medium">{cancha.nombre}</TableCell>
                      <TableCell>{cancha.ubicacion}</TableCell>
                      <TableCell>{cancha.capacidad} personas</TableCell>
                      <TableCell>
                        <Badge
                          variant={cancha.estado === 'activa' ? 'default' : 'secondary'}
                          className={
                            cancha.estado === 'activa'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {cancha.estado === 'activa' ? 'Activa' : 'Mantenimiento'}
                        </Badge>
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
              <Button onClick={() => setHorarioDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Horario
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Hora Inicio</TableHead>
                    <TableHead>Hora Fin</TableHead>
                    <TableHead>Intervalo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {horariosMock.map((horario) => (
                    <TableRow key={horario.id}>
                      <TableCell className="font-medium">{horario.dia}</TableCell>
                      <TableCell>{horario.horaInicio}</TableCell>
                      <TableCell>{horario.horaFin}</TableCell>
                      <TableCell>{horario.intervalo} minutos</TableCell>
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
            <DialogTitle>Nueva Cancha</DialogTitle>
            <DialogDescription>
              Agrega una nueva cancha al sistema
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombreCancha">Nombre</Label>
              <Input id="nombreCancha" placeholder="Ej: Cancha Principal" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacionCancha">Ubicación</Label>
              <Input id="ubicacionCancha" placeholder="Ej: Sede Central" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacidadCancha">Capacidad</Label>
              <Input id="capacidadCancha" type="number" placeholder="100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCanchaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setCanchaDialogOpen(false)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuevo Horario */}
      <Dialog open={horarioDialogOpen} onOpenChange={setHorarioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Horario</DialogTitle>
            <DialogDescription>
              Define un nuevo horario para programar partidos
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="diaHorario">Día</Label>
              <Input id="diaHorario" placeholder="Ej: Sábado" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horaInicio">Hora Inicio</Label>
                <Input id="horaInicio" type="time" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaFin">Hora Fin</Label>
                <Input id="horaFin" type="time" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHorarioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setHorarioDialogOpen(false)}>Guardar</Button>
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
