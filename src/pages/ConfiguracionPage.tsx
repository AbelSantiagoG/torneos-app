import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo, torneoActivoQueryKey } from '@/features/torneos/useTorneoActivo'
import { invalidateTorneoQueries, torneosListQueryKey } from '@/features/torneos/TorneoProvider'
import { deleteTorneo, getTorneos, updateTorneo } from '@/features/torneos/torneosService'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
import { uploadImageAndRegister } from '@/features/media/mediaAssetsService'
import { MediaAssetPicker } from '@/components/media/MediaAssetPicker'
import { CrearTorneoDialog } from '@/components/torneos/CrearTorneoDialog'
import { useAppTheme } from '@/features/theme/ThemeProvider'
import { useCategorias } from '@/features/categorias/useCategorias'
import { translateUserError } from '@/lib/errorMessages'
import { formatCurrency } from '@/lib/utils'
import { useCanchas } from '@/features/canchas/useCanchas'
import type { EstadoTorneo } from '@/types/database'
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
  List,
} from 'lucide-react'

const ESTADO_TORNEO_LABEL: Record<EstadoTorneo, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
}

export function ConfiguracionPage() {
  const qc = useQueryClient()
  const logoFileRef = useRef<HTMLInputElement>(null)
  const { darkMode, setDarkMode } = useAppTheme()
  const [configTab, setConfigTab] = useState('general')
  const [canchaDialogOpen, setCanchaDialogOpen] = useState(false)
  const [usuarioDialogOpen, setUsuarioDialogOpen] = useState(false)
  const [torneoLogoPickerOpen, setTorneoLogoPickerOpen] = useState(false)
  const [crearTorneoOpen, setCrearTorneoOpen] = useState(false)

  const { data: torneo, isLoading: torneoLoading, torneos, setTorneoId } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: categoriasLoading } = useCategorias(torneoId)

  const [torneoForm, setTorneoForm] = useState({
    nombre: '',
    organizacion: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    logo_url: '',
    logo_public_id: '' as string | null,
  })

  useEffect(() => {
    if (!torneo) return
    setTorneoForm({
      nombre: torneo.nombre ?? '',
      organizacion: torneo.organizacion ?? '',
      descripcion: torneo.descripcion ?? '',
      fecha_inicio: torneo.fecha_inicio ?? '',
      fecha_fin: torneo.fecha_fin ?? '',
      logo_url: torneo.logo_url ?? '',
      logo_public_id: torneo.logo_public_id ?? null,
    })
  }, [torneo])

  const saveTorneo = useMutation({
    mutationFn: async () => {
      if (!torneoId) throw new Error('Sin torneo')
      await updateTorneo(torneoId, {
        nombre: torneoForm.nombre.trim(),
        organizacion: torneoForm.organizacion.trim(),
        descripcion: torneoForm.descripcion.trim() || null,
        fecha_inicio: torneoForm.fecha_inicio || null,
        fecha_fin: torneoForm.fecha_fin || null,
        logo_url: torneoForm.logo_url.trim() || null,
        logo_public_id: torneoForm.logo_public_id?.trim() || null,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: torneoActivoQueryKey })
      toast.success('Torneo actualizado')
    },
    onError: (e) => toast.error(translateUserError(e, 'torneo')),
  })

  const deleteTorneoMut = useMutation({
    mutationFn: async () => {
      if (!torneoId) throw new Error('Sin torneo')
      await deleteTorneo(torneoId)
    },
    onSuccess: async () => {
      invalidateTorneoQueries(qc)
      await qc.invalidateQueries({ queryKey: torneosListQueryKey })
      const list = await getTorneos()
      if (list[0]) setTorneoId(list[0].id)
      toast.success('Torneo eliminado')
    },
    onError: (e) => toast.error(translateUserError(e, 'torneo')),
  })

  const {
    data: canchas = [],
    isLoading: canchasLoading,
    createCancha,
    updateCancha,
    deleteCancha,
    isMutating: canchasMutating,
  } = useCanchas(torneoId)

  const [canchaForm, setCanchaForm] = useState({ id: undefined as string | undefined, nombre: '', ubicacion: '', activa: true })

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        description="Administra la configuración general del torneo"
      />

      <CrearTorneoDialog open={crearTorneoOpen} onOpenChange={setCrearTorneoOpen} />
      <MediaAssetPicker
        open={torneoLogoPickerOpen}
        onOpenChange={setTorneoLogoPickerOpen}
        torneoId={torneoId}
        tipo="torneo_logo"
        onSelect={(a) =>
          setTorneoForm((f) => ({
            ...f,
            logo_url: a.secure_url,
            logo_public_id: a.public_id,
          }))
        }
      />

      <Tabs value={configTab} onValueChange={setConfigTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="torneos" className="gap-2">
            <List className="h-4 w-4" />
            Torneos
          </TabsTrigger>
          <TabsTrigger value="canchas" className="gap-2">
            <MapPin className="h-4 w-4" />
            Canchas
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
                  <p className="text-sm text-muted-foreground">Datos del torneo en Supabase (tabla torneos).</p>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombreTorneo">Nombre del Torneo</Label>
                      <Input
                        id="nombreTorneo"
                        value={torneoForm.nombre}
                        onChange={(e) => setTorneoForm((f) => ({ ...f, nombre: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organizacion">Organización</Label>
                      <Input
                        id="organizacion"
                        value={torneoForm.organizacion}
                        onChange={(e) => setTorneoForm((f) => ({ ...f, organizacion: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaInicio">Fecha de Inicio</Label>
                      <Input
                        id="fechaInicio"
                        type="date"
                        value={torneoForm.fecha_inicio}
                        onChange={(e) => setTorneoForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fechaFin">Fecha de Finalización</Label>
                      <Input
                        id="fechaFin"
                        type="date"
                        value={torneoForm.fecha_fin}
                        onChange={(e) => setTorneoForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">URL del logo (opcional si subes archivo)</Label>
                    <Input
                      id="logoUrl"
                      value={torneoForm.logo_url}
                      onChange={(e) =>
                        setTorneoForm((f) => ({
                          ...f,
                          logo_url: e.target.value,
                          logo_public_id: null,
                        }))
                      }
                      placeholder="https://..."
                    />
                    <input
                      ref={logoFileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file || !torneoId) return
                        void (async () => {
                          try {
                            const up = await uploadImageAndRegister(file, { torneoId, type: 'torneo_logo' })
                            setTorneoForm((f) => ({
                              ...f,
                              logo_url: up.secure_url,
                              logo_public_id: up.public_id,
                            }))
                            toast.success('Logo subido. Pulsa Guardar para persistir en el torneo.')
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'No se pudo subir el logo')
                          }
                        })()
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => logoFileRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Subir logo (Cloudinary)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!torneoId}
                        onClick={() => setTorneoLogoPickerOpen(true)}
                      >
                        <List className="mr-2 h-4 w-4" />
                        Biblioteca
                      </Button>
                      {resolveDisplayImageUrl(torneoForm.logo_public_id, torneoForm.logo_url, displayImagePresets.torneoLogo()) ? (
                        <img
                          src={resolveDisplayImageUrl(
                            torneoForm.logo_public_id,
                            torneoForm.logo_url,
                            displayImagePresets.torneoLogo(),
                          )}
                          alt=""
                          className="h-14 w-14 rounded-full border object-cover"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <textarea
                      className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={torneoForm.descripcion}
                      onChange={(e) => setTorneoForm((f) => ({ ...f, descripcion: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  className="gap-2"
                  type="button"
                  disabled={!torneoId || saveTorneo.isPending}
                  onClick={() => void saveTorneo.mutateAsync()}
                >
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </Button>
                <Button
                  variant="destructive"
                  type="button"
                  disabled={!torneoId || deleteTorneoMut.isPending}
                  onClick={() => {
                    if (
                      !confirm(
                        '¿Eliminar este torneo y todos sus datos (categorías, equipos, partidos, finanzas)? Esta acción no se puede deshacer.',
                      )
                    )
                      return
                    void deleteTorneoMut.mutateAsync()
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar torneo
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
              <p className="text-sm text-muted-foreground">
                Los datos de contacto públicos no están modelados en la tabla torneos; agrégalos en Supabase o en la
                descripción del torneo.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="torneos" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Torneos</CardTitle>
                <CardDescription>
                  Lista de torneos visibles para tu usuario. El activo se usa en toda la app; edita datos en la pestaña
                  General.
                </CardDescription>
              </div>
              <Button type="button" className="gap-2" onClick={() => setCrearTorneoOpen(true)}>
                <Plus className="h-4 w-4" />
                Nuevo torneo
              </Button>
            </CardHeader>
            <CardContent>
              {torneos.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Sin torneos"
                  description="Crea un torneo para comenzar."
                  action={
                    <Button type="button" onClick={() => setCrearTorneoOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear torneo
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Organización</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {torneos.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.nombre}</TableCell>
                        <TableCell>{t.organizacion}</TableCell>
                        <TableCell>
                          <Badge variant={t.estado === 'activo' ? 'default' : 'secondary'}>
                            {ESTADO_TORNEO_LABEL[t.estado as EstadoTorneo] ?? t.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant={torneo?.id === t.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setTorneoId(t.id)
                              setConfigTab('general')
                            }}
                          >
                            {torneo?.id === t.id ? 'Torneo activo' : 'Activar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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

        {/* Tarifas */}
        <TabsContent value="tarifas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarifas por categoría</CardTitle>
              <CardDescription>
                Los valores de inscripción y arbitraje viven en la tabla categorías. Edítalos en el módulo Categorías.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoriasLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : categorias.length === 0 ? (
                <EmptyState icon={DollarSign} title="Sin categorías" description="Crea categorías para definir tarifas." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Inscripción</TableHead>
                      <TableHead className="text-right">Arbitraje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorias.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nombre}</TableCell>
                        <TableCell className="text-right">{formatCurrency(c.valorInscripcion)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(c.tarifaArbitraje)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categorías del torneo</CardTitle>
              <CardDescription>Resumen de tarifas por categoría; edita formato y edad máxima en el módulo Categorías.</CardDescription>
            </CardHeader>
            <CardContent>
              {categoriasLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay categorías creadas.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categorias.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="font-medium">{c.nombre}</span>
                      <span className="text-right text-xs text-muted-foreground">
                        Inscripción {formatCurrency(c.valorInscripcion)}
                        <br />
                        Arbitraje {formatCurrency(c.tarifaArbitraje)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                <CardDescription>Gestión de usuarios de la app: pendiente (no hay tabla dedicada en el esquema actual).</CardDescription>
              </div>
              <Button disabled className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Usuario
              </Button>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Users}
                title="Sin integración de usuarios"
                description="El acceso sigue controlado por Supabase Auth. Aquí no se listan usuarios mock."
              />
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
                <Switch checked={darkMode} onCheckedChange={(v) => setDarkMode(v)} />
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
