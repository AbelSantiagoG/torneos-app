import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Plus, Upload, Users, Edit, Trash2, AlertCircle, CheckCircle, Search, UserPlus, ArrowRightLeft, Download, User } from 'lucide-react'
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
import { CrearTorneoDialog } from '@/components/torneos/CrearTorneoDialog'
import { existeEquipoNombreEnCategoria } from '@/features/equipos/equiposService'
import { parseSpreadsheetToRows } from '@/features/excel/parseSheet'
import { importEquiposFromRows } from '@/features/excel/importEquipos'
import { importJugadoresFromRows } from '@/features/excel/importJugadores'
import {
  DESCRIPCION_IMPORT_EQUIPOS,
  DESCRIPCION_IMPORT_JUGADORES,
} from '@/features/excel/plantillasImportacion'
import { downloadPlantillaEquiposXlsx, downloadPlantillaJugadoresXlsx } from '@/features/excel/xlsxTemplates'
import { translateUserError } from '@/lib/errorMessages'
import { edadDesdeAnio, onFechaNacimientoChange, resolverAnioNacimiento } from '@/lib/jugadorFecha'
import {
  displayImagePresets,
  resolveDisplayImageUrl,
} from '@/features/uploads/uploadService'
import { uploadImageAndRegister } from '@/features/media/mediaAssetsService'
import { MediaAssetPicker } from '@/components/media/MediaAssetPicker'
import { PageHeader } from '@/components/common/PageHeader'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias, categoriasQueryKey } from '@/features/categorias/useCategorias'
import { useEquipos, equiposQueryKey } from '@/features/equipos/useEquipos'
import { useJugadoresPorCategoria } from '@/features/jugadores/useJugadoresPorCategoria'
import { useJugadores } from '@/features/jugadores/useJugadores'
import { jugadoresQueryKey } from '@/features/jugadores/useJugadores'
import { jugadoresCategoriaQueryKey } from '@/features/jugadores/useJugadoresPorCategoria'
import type { Equipo } from '@/types/torneo'
import { useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'

export function EquiposPage() {
  const qc = useQueryClient()

  const [importReport, setImportReport] = useState<{
    titulo: string
    validos?: number
    creados: number
    omitidos: string[]
    errores: { fila: number; mensaje: string }[]
  } | null>(null)
  const { data: torneo, isLoading: torneoLoading, torneos } = useTorneoActivo()
  const torneoId = torneo?.id

  const [crearTorneoOpen, setCrearTorneoOpen] = useState(false)

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
  const [teamForm, setTeamForm] = useState({
    nombre: '',
    sigla: '',
    color: '#dc2626',
    observaciones: '',
    logoUrl: '' as string | null,
    logoPublicId: '' as string | null,
  })

  const [isPlayersSheetOpen, setIsPlayersSheetOpen] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null)

  const {
    data: jugadoresEquipo = [],
    createJugador,
    cambiarJugadorDeEquipo,
    desactivarJugador,
    eliminarJugador,
    eliminarJugadoresEquipo,
    isMutating: jugMutating,
  } = useJugadores(selectedEquipo?.id, selectedCategoria || undefined)

  const jugadoresEquipoFiltrados = useMemo(() => {
    const t = playerSearch.trim().toLowerCase()
    if (!t) return jugadoresEquipo
    return jugadoresEquipo.filter(
      (j) => j.nombre.toLowerCase().includes(t) || String(j.documento ?? '').toLowerCase().includes(t),
    )
  }, [jugadoresEquipo, playerSearch])

  const [playerForm, setPlayerForm] = useState({
    nombreCompleto: '',
    documento: '',
    anioNacimiento: '',
    fechaNacimiento: '',
    observaciones: '',
    fotoUrl: '' as string | null,
    fotoPublicId: '' as string | null,
  })
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false)
  const [teamMediaPickerOpen, setTeamMediaPickerOpen] = useState(false)
  const [playerMediaPickerOpen, setPlayerMediaPickerOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferTarget, setTransferTarget] = useState<{ jugadorId: string; nombre: string } | null>(null)
  const [transferEquipoId, setTransferEquipoId] = useState('')
  const [transferMotivo, setTransferMotivo] = useState('')

  const filteredEquipos = useMemo(
    () => equiposLista.filter((e) => e.nombre.toLowerCase().includes(searchQuery.toLowerCase())),
    [equiposLista, searchQuery],
  )

  const equiposImportRef = useRef<HTMLInputElement>(null)
  const jugadoresImportRef = useRef<HTMLInputElement>(null)
  const teamLogoInputRef = useRef<HTMLInputElement>(null)
  const playerFotoInputRef = useRef<HTMLInputElement>(null)

  const openTeamDialog = (equipo?: Equipo) => {
    if (equipo) {
      setEditingEquipo(equipo)
      setTeamForm({
        nombre: equipo.nombre,
        sigla: equipo.sigla ?? '',
        color: equipo.color,
        observaciones: equipo.observaciones ?? '',
        logoUrl: equipo.logoUrl ?? null,
        logoPublicId: equipo.logoPublicId ?? null,
      })
    } else {
      setEditingEquipo(null)
      setTeamForm({
        nombre: '',
        sigla: '',
        color: '#dc2626',
        observaciones: '',
        logoUrl: null,
        logoPublicId: null,
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
    const catId = editingEquipo?.categoriaId ?? selectedCategoria
    if (!catId) {
      toast.error('Selecciona una categoría')
      return
    }
    if (!teamForm.sigla.trim()) {
      toast.error('La sigla es obligatoria')
      return
    }
    if (!teamForm.color?.trim()) {
      toast.error('El color es obligatorio')
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
            observaciones: teamForm.observaciones.trim() || null,
            logo_url: teamForm.logoUrl ?? null,
            logo_public_id: (teamForm.logoPublicId || editingEquipo.logoPublicId) ?? null,
          },
        })
        toast.success('Equipo actualizado')
      } else {
        const existe = await existeEquipoNombreEnCategoria(catId, teamForm.nombre.trim())
        if (existe) {
          toast.error('Ya existe un equipo con ese nombre en esta categoría.')
          return
        }
        await createEquipo({
          categoriaId: catId,
          data: {
            nombre: teamForm.nombre.trim(),
            sigla: teamForm.sigla.trim() || null,
            color: teamForm.color,
            observaciones: teamForm.observaciones.trim() || null,
            logo_url: teamForm.logoUrl ?? null,
            logo_public_id: teamForm.logoPublicId ?? null,
          },
        })
        toast.success('Equipo creado')
      }
      setIsTeamDialogOpen(false)
    } catch (e) {
      toast.error(translateUserError(e, 'equipo'))
    }
  }

  const handleDeleteEquipo = async (id: string) => {
    try {
      await deleteEquipo(id)
      toast.success('Equipo eliminado')
    } catch (e) {
      toast.error(translateUserError(e, 'equipo'))
    }
  }

  const openPlayersSheet = (equipo: Equipo) => {
    setSelectedEquipo(equipo)
    setIsPlayersSheetOpen(true)
    setPlayerForm({
      nombreCompleto: '',
      documento: '',
      anioNacimiento: '',
      fechaNacimiento: '',
      observaciones: '',
      fotoUrl: null,
      fotoPublicId: null,
    })
  }

  const savePlayer = async () => {
    if (!selectedEquipo) return
    if (!playerForm.nombreCompleto.trim()) {
      toast.error('El nombre completo es obligatorio')
      return
    }
    if (!playerForm.documento.trim()) {
      toast.error('El documento es obligatorio')
      return
    }
    let anio: number
    let fecha: string | null
    try {
      const resolved = resolverAnioNacimiento({
        fecha_nacimiento: playerForm.fechaNacimiento.trim() || null,
        anio_nacimiento: playerForm.anioNacimiento.trim() ? Number(playerForm.anioNacimiento) : null,
      })
      anio = resolved.anio
      fecha = resolved.fecha
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Fecha de nacimiento no válida')
      return
    }
    try {
      await createJugador({
        nombre_completo: playerForm.nombreCompleto.trim(),
        documento: playerForm.documento.trim(),
        anio_nacimiento: anio,
        fecha_nacimiento: fecha,
        observaciones: playerForm.observaciones.trim() || null,
        foto_url: playerForm.fotoUrl ?? null,
        foto_public_id: playerForm.fotoPublicId ?? null,
      })
      toast.success('Jugador registrado')
      setPlayerDialogOpen(false)
      setPlayerForm({
        nombreCompleto: '',
        documento: '',
        anioNacimiento: '',
        fechaNacimiento: '',
        observaciones: '',
        fotoUrl: null,
        fotoPublicId: null,
      })
    } catch (e) {
      toast.error(translateUserError(e, 'jugador'))
    }
  }

  const handleEquiposExcelChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !torneoId || !selectedCategoria) {
      toast.error('Selecciona una categoría e importa un archivo .xlsx o .csv.')
      return
    }
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      toast.error('Formato no soportado. Usa .xlsx, .xls o .csv.')
      return
    }
    try {
      const rows = await parseSpreadsheetToRows(file)
      const res = await importEquiposFromRows(rows, { torneoId, categoriaId: selectedCategoria })
      setImportReport({
        titulo: 'Importación de equipos',
        creados: res.creados,
        omitidos: res.omitidos,
        errores: res.errores,
      })
      toast.success(`Equipos: ${res.creados} creados.`)
      if (res.omitidos.length) {
        toast.message('Algunas filas se omitieron por duplicados en el archivo o porque ya existían en la categoría.')
      }
      if (res.errores.length) {
        toast.error('Hay filas con errores. Revisa el resumen.')
      }
      void qc.invalidateQueries({ queryKey: equiposQueryKey(selectedCategoria) })
      void qc.invalidateQueries({ queryKey: categoriasQueryKey(torneoId) })
    } catch (err) {
      toast.error(translateUserError(err, 'excel'))
    }
  }

  const handleJugadoresExcelChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const eqId = selectedEquipo?.id
    const catId = selectedCategoria
    if (!file || !eqId) {
      toast.error('Abre el listado de jugadores de un equipo antes de importar.')
      return
    }
    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.csv')) {
      toast.error('Formato no soportado. Usa .xlsx, .xls o .csv.')
      return
    }
    try {
      const rows = await parseSpreadsheetToRows(file)
      const res = await importJugadoresFromRows(rows, eqId)
      setImportReport({
        titulo: 'Importación de jugadores',
        validos: res.validos,
        creados: res.creados,
        omitidos: res.omitidos,
        errores: res.errores,
      })
      toast.success(`Jugadores: ${res.creados} creados.`)
      if (res.omitidos.length) {
        toast.message('Algunas filas se omitieron por documento duplicado en el archivo o jugador ya existente.')
      }
      if (res.errores.length) {
        toast.error('Hay filas con errores. Revisa el resumen.')
      }
      if (catId) {
        void qc.invalidateQueries({ queryKey: equiposQueryKey(catId) })
        void qc.invalidateQueries({ queryKey: jugadoresCategoriaQueryKey(catId) })
      }
      void qc.invalidateQueries({ queryKey: jugadoresQueryKey(eqId) })
    } catch (err) {
      toast.error(translateUserError(err, 'excel'))
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
      toast.error(translateUserError(e, 'jugador'))
    }
  }

  const handleDeactivatePlayer = async (jugadorId: string) => {
    try {
      await desactivarJugador(jugadorId)
      toast.success('Jugador desactivado')
    } catch (e) {
      toast.error(translateUserError(e, 'jugador'))
    }
  }

  const handleDeletePlayer = async (jugadorId: string) => {
    if (!confirm('¿Eliminar definitivamente este jugador? Si tiene goles o tarjetas en actas, puede fallar.')) return
    try {
      await eliminarJugador(jugadorId)
      toast.success('Jugador eliminado')
    } catch (e) {
      toast.error(translateUserError(e, 'jugador'))
    }
  }

  const isAssociatedPlayersError = (error: unknown) => {
    const msg = String((error as Error)?.message ?? error ?? '').toLowerCase()
    return ['acta', 'goles', 'gol', 'tarjeta', 'asociad', 'forzar', 'relacionad'].some((token) => msg.includes(token))
  }

  const handleDeleteAllPlayers = async () => {
    if (!selectedEquipo) return
    const ok = confirm('Esto eliminará todos los jugadores de este equipo y sus registros asociados. ¿Deseas continuar?')
    if (!ok) return
    try {
      try {
        await eliminarJugadoresEquipo({ forzar: false })
      } catch (e) {
        if (!isAssociatedPlayersError(e)) throw e
        const force = confirm(
          'Estos jugadores tienen información asociada en actas, goles o tarjetas. Si continúas, también se eliminarán esos registros.',
        )
        if (!force) return
        await eliminarJugadoresEquipo({ forzar: true })
      }
      qc.setQueryData(jugadoresQueryKey(selectedEquipo.id), [])
      if (selectedCategoria) {
        void qc.invalidateQueries({ queryKey: jugadoresCategoriaQueryKey(selectedCategoria) })
        void qc.invalidateQueries({ queryKey: equiposQueryKey(selectedCategoria) })
      }
      toast.success('Jugadores eliminados correctamente.')
    } catch (e) {
      toast.error(translateUserError(e, 'jugador'))
    }
  }

  const loading = torneoLoading || catLoading
  const catNombre = categorias.find((c) => c.id === selectedCategoria)?.nombre ?? ''

  if (!torneoLoading && torneos.length === 0) {
    return (
      <div className="space-y-6">
        <CrearTorneoDialog open={crearTorneoOpen} onOpenChange={setCrearTorneoOpen} />
        <PageHeader title="Equipos y Jugadores" description="Gestiona equipos y jugadores por categoría" />
        <EmptyState
          icon={Users}
          title="Crea tu primer torneo"
          description="Aún no hay torneos en Supabase. Crea uno para cargar categorías, equipos y jugadores."
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
        <PageHeader title="Equipos y Jugadores" description="Gestiona equipos y jugadores por categoría" />
        <EmptyState
          icon={Users}
          title="Sin torneo activo"
          description="Selecciona un torneo en la barra superior o crea uno nuevo."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <CrearTorneoDialog open={crearTorneoOpen} onOpenChange={setCrearTorneoOpen} />
      <Dialog open={Boolean(importReport)} onOpenChange={(o) => !o && setImportReport(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Resumen de importación</DialogTitle>
            <DialogDescription>{importReport?.titulo}</DialogDescription>
          </DialogHeader>
          {importReport && (
            <div className="space-y-3 text-sm">
              <p>
                <strong>Registros válidos:</strong> {importReport.validos ?? importReport.creados}
              </p>
              <p>
                <strong>Creados:</strong> {importReport.creados}
              </p>
              <p>
                <strong>Omitidos:</strong> {importReport.omitidos.length}
              </p>
              {importReport.omitidos.length > 0 && (
                <ul className="max-h-32 list-disc overflow-y-auto pl-5 text-muted-foreground">
                  {importReport.omitidos.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              <p>
                <strong>Errores:</strong> {importReport.errores.length}
              </p>
              {importReport.errores.length > 0 && (
                <ul className="max-h-40 list-disc overflow-y-auto pl-5 text-destructive">
                  {importReport.errores.map((e, i) => (
                    <li key={i}>
                      Fila {e.fila}: {e.mensaje}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={() => setImportReport(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <details className="rounded-lg border bg-card px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Formato para importar Excel / CSV</summary>
        <p className="mt-2 text-muted-foreground">{DESCRIPCION_IMPORT_EQUIPOS}</p>
        <p className="mt-2 text-muted-foreground">{DESCRIPCION_IMPORT_JUGADORES}</p>
      </details>
      <PageHeader
        title="Equipos y Jugadores"
        description="Gestiona los equipos inscritos y sus jugadores por categoría"
        actions={
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
                      placeholder="Nombre del equipo"
                      value={teamForm.nombre}
                      onChange={(e) => setTeamForm({ ...teamForm, nombre: e.target.value })}
                    />
                  </div>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Categoría: </span>
                    <span className="font-medium">
                      {categorias.find((c) => c.id === (editingEquipo?.categoriaId ?? selectedCategoria))?.nombre ?? '—'}
                    </span>
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
                  <div className="space-y-2">
                    <Label htmlFor="teamObs">Observaciones</Label>
                    <Input
                      id="teamObs"
                      value={teamForm.observaciones}
                      onChange={(e) => setTeamForm({ ...teamForm, observaciones: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Logo del equipo</Label>
                    <input
                      ref={teamLogoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!f) return
                        void (async () => {
                          try {
                            if (!torneoId) {
                              toast.error('No hay torneo activo')
                              return
                            }
                            const up = await uploadImageAndRegister(f, { torneoId, type: 'equipo_logo' })
                            setTeamForm((prev) => ({
                              ...prev,
                              logoUrl: up.secure_url,
                              logoPublicId: up.public_id,
                            }))
                            toast.success('Logo listo para guardar')
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'No se pudo subir el logo')
                          }
                        })()
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => teamLogoInputRef.current?.click()}>
                        Subir imagen
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setTeamMediaPickerOpen(true)}>
                        Biblioteca
                      </Button>
                      {resolveDisplayImageUrl(teamForm.logoPublicId, teamForm.logoUrl, displayImagePresets.equipoLogo()) ? (
                        <img
                          src={resolveDisplayImageUrl(
                            teamForm.logoPublicId,
                            teamForm.logoUrl,
                            displayImagePresets.equipoLogo(),
                          )}
                          alt=""
                          className="h-12 w-12 rounded-md border object-cover"
                        />
                      ) : null}
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
          <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
            <input
              ref={equiposImportRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => void handleEquiposExcelChange(e)}
            />
            <Button variant="outline" type="button" size="sm" onClick={() => downloadPlantillaEquiposXlsx()}>
              <Download className="mr-2 h-4 w-4" />
              Descargar plantilla de equipos
            </Button>
            <Button
              variant="outline"
              type="button"
              size="sm"
              disabled={!selectedCategoria || eqMutating}
              onClick={() => equiposImportRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar equipos
            </Button>
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
                      {resolveDisplayImageUrl(equipo.logoPublicId, equipo.logoUrl, displayImagePresets.equipoLogo()) ? (
                        <img
                          src={resolveDisplayImageUrl(
                            equipo.logoPublicId,
                            equipo.logoUrl,
                            displayImagePresets.equipoLogo(),
                          )}
                          alt=""
                          className="h-12 w-12 rounded-lg border object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white"
                          style={{ backgroundColor: equipo.color }}
                        >
                          {equipo.logoPlaceholder}
                        </div>
                      )}
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
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Nacimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jugadoresCategoria.map((jugador) => {
                  const fotoSrc = resolveDisplayImageUrl(jugador.fotoPublicId, jugador.fotoUrl, {
                    width: 40,
                    height: 40,
                    crop: 'fill',
                    quality: 'auto',
                    format: 'auto',
                  })
                  return (
                  <TableRow key={jugador.id}>
                    <TableCell>
                      {fotoSrc ? (
                        <img src={fotoSrc} alt="" className="h-9 w-9 rounded-md border object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{jugador.nombre}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: jugador.equipoColor }} />
                        {jugador.equipoNombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{jugador.documento}</TableCell>
                    <TableCell>{jugador.fechaNacimiento ?? jugador.anioNacimiento}</TableCell>
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
                  )
                })}
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
              {resolveDisplayImageUrl(
                selectedEquipo?.logoPublicId,
                selectedEquipo?.logoUrl,
                displayImagePresets.equipoLogo(),
              ) ? (
                <img
                  src={resolveDisplayImageUrl(
                    selectedEquipo?.logoPublicId,
                    selectedEquipo?.logoUrl,
                    displayImagePresets.equipoLogo(),
                  )}
                  alt=""
                  className="h-10 w-10 rounded-lg border object-cover"
                />
              ) : (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
                  style={{ backgroundColor: selectedEquipo?.color }}
                >
                  {selectedEquipo?.logoPlaceholder}
                </div>
              )}
              <div>
                <SheetTitle>{selectedEquipo?.nombre}</SheetTitle>
                <SheetDescription>Gestión de jugadores del equipo</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <div className="mt-6 flex flex-1 flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar jugador por nombre o documento…"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-medium">{jugadoresEquipo.length} jugadores activos</h4>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={jugadoresImportRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => void handleJugadoresExcelChange(e)}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => downloadPlantillaJugadoresXlsx()}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar plantilla de jugadores
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => jugadoresImportRef.current?.click()} disabled={jugMutating}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar jugadores
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => void handleDeleteAllPlayers()}
                  disabled={jugMutating || jugadoresEquipo.length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar todos los jugadores
                </Button>
                <Button size="sm" onClick={() => setPlayerDialogOpen(true)} disabled={jugMutating}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
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
                    <Label>Documento</Label>
                    <Input
                      value={playerForm.documento}
                      onChange={(e) => setPlayerForm({ ...playerForm, documento: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de nacimiento</Label>
                    <Input
                      type="date"
                      value={playerForm.fechaNacimiento}
                      onChange={(e) => {
                        const { fecha, anio } = onFechaNacimientoChange(e.target.value)
                        setPlayerForm({ ...playerForm, fechaNacimiento: fecha, anioNacimiento: anio })
                      }}
                    />
                    {playerForm.anioNacimiento && (
                      <p className="text-xs text-muted-foreground">
                        Fecha normalizada: {playerForm.fechaNacimiento}
                        {edadDesdeAnio(Number(playerForm.anioNacimiento)) > 0 &&
                          ` · Edad aprox.: ${edadDesdeAnio(Number(playerForm.anioNacimiento))} años`}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Observaciones (opcional)</Label>
                    <Input
                      value={playerForm.observaciones}
                      onChange={(e) => setPlayerForm({ ...playerForm, observaciones: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Foto del jugador</Label>
                    <input
                      ref={playerFotoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!f) return
                        void (async () => {
                          try {
                            if (!torneoId) {
                              toast.error('No hay torneo activo')
                              return
                            }
                            const up = await uploadImageAndRegister(f, { torneoId, type: 'jugador_foto' })
                            setPlayerForm((prev) => ({
                              ...prev,
                              fotoUrl: up.secure_url,
                              fotoPublicId: up.public_id,
                            }))
                            toast.success('Foto lista para guardar')
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'No se pudo subir la foto')
                          }
                        })()
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => playerFotoInputRef.current?.click()}>
                        Subir foto
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPlayerMediaPickerOpen(true)}>
                        Biblioteca
                      </Button>
                      {resolveDisplayImageUrl(playerForm.fotoPublicId, playerForm.fotoUrl, displayImagePresets.jugadorFoto()) ? (
                        <img
                          src={resolveDisplayImageUrl(
                            playerForm.fotoPublicId,
                            playerForm.fotoUrl,
                            displayImagePresets.jugadorFoto(),
                          )}
                          alt=""
                          className="h-14 w-14 rounded-md border object-cover"
                        />
                      ) : null}
                    </div>
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
              {jugadoresEquipo.length === 0 ? (
                <div className="p-8">
                  <EmptyState
                    icon={UserPlus}
                    title="Sin jugadores en el equipo"
                    description="Agrega jugadores manualmente o importa desde Excel."
                    action={
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button size="sm" onClick={() => setPlayerDialogOpen(true)}>
                          Agregar jugador
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => jugadoresImportRef.current?.click()}>
                          Importar jugadores
                        </Button>
                      </div>
                    }
                  />
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Foto</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Nacimiento</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jugadoresEquipoFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Ningún jugador coincide con la búsqueda.
                      </TableCell>
                    </TableRow>
                  ) : jugadoresEquipoFiltrados.map((jugador) => {
                    const fotoSrc = resolveDisplayImageUrl(jugador.fotoPublicId, jugador.fotoUrl, {
                      width: 40,
                      height: 40,
                      crop: 'fill',
                      quality: 'auto',
                      format: 'auto',
                    })
                    return (
                    <TableRow key={jugador.id}>
                      <TableCell>
                        {fotoSrc ? (
                          <img src={fotoSrc} alt="" className="h-8 w-8 rounded-md border object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{jugador.nombre}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{jugador.documento}</TableCell>
                      <TableCell className="text-sm">
                        {jugador.fechaNacimiento ?? jugador.anioNacimiento ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {jugador.anioNacimiento ? edadDesdeAnio(jugador.anioNacimiento) : '—'}
                      </TableCell>
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
                          Retirar
                        </Button>
                        <Button
                          variant="ghost"
                          type="button"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void handleDeletePlayer(jugador.id)}
                          disabled={jugMutating}
                        >
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <MediaAssetPicker
        open={teamMediaPickerOpen}
        onOpenChange={setTeamMediaPickerOpen}
        torneoId={torneoId}
        tipo="equipo_logo"
        onSelect={(a) =>
          setTeamForm((prev) => ({
            ...prev,
            logoUrl: a.secure_url,
            logoPublicId: a.public_id,
          }))
        }
      />
      <MediaAssetPicker
        open={playerMediaPickerOpen}
        onOpenChange={setPlayerMediaPickerOpen}
        torneoId={torneoId}
        tipo="jugador_foto"
        onSelect={(a) =>
          setPlayerForm((prev) => ({
            ...prev,
            fotoUrl: a.secure_url,
            fotoPublicId: a.public_id,
          }))
        }
      />
    </div>
  )
}
