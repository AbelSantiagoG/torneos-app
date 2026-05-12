import { useEffect, useMemo, useState } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Plus,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  Pencil,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { translateUserError } from '@/lib/errorMessages'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useFinanzas } from '@/features/finanzas/useFinanzas'
import { useCategorias } from '@/features/categorias/useCategorias'
import type { CarteraRowUi, EgresoRow } from '@/features/finanzas/finanzasService'

function labelCategoriaGasto(slug: string): string {
  const m: Record<string, string> = {
    infraestructura: 'Infraestructura',
    material_deportivo: 'Material deportivo',
    premiacion: 'Premiación',
    administrativo: 'Administrativo',
    eventos: 'Eventos',
    arbitraje: 'Arbitraje',
    otro: 'Otro',
    material: 'Material deportivo',
    otros: 'Otro',
  }
  return m[slug] ?? slug.replace(/_/g, ' ')
}

function normalizeEgresoCategoriaSelect(raw: string): string {
  const v = raw.trim().toLowerCase()
  if (v === 'material') return 'material_deportivo'
  if (v === 'otros') return 'otro'
  return raw
}

export function FinanzasPage() {
  const [activeTab, setActiveTab] = useState('estado')
  const [isEgresoDialogOpen, setIsEgresoDialogOpen] = useState(false)
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false)
  const [editingEgreso, setEditingEgreso] = useState<EgresoRow | null>(null)
  const [deleteEgresoId, setDeleteEgresoId] = useState<string | null>(null)

  const [egresoForm, setEgresoForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    concepto: '',
    categoriaGasto: '',
    valor: '',
    responsable: '',
  })

  const [abonoForm, setAbonoForm] = useState({
    equipoId: '',
    valor: '',
    concepto: 'Abono inscripción',
    fecha: new Date().toISOString().slice(0, 10),
    medioPago: 'efectivo',
  })

  const { data: torneo, isLoading: torneoLoading, error: torneoError } = useTorneoActivo()
  const torneoId = torneo?.id

  const {
    data: finData,
    isLoading: finLoading,
    error: finError,
    refetch,
    createEgreso,
    updateEgreso,
    deleteEgreso,
    createAbono,
    isMutating,
  } = useFinanzas(torneoId)

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)

  useEffect(() => {
    if (torneoError) toast.error(torneoError instanceof Error ? torneoError.message : 'Error al cargar torneo')
  }, [torneoError])

  useEffect(() => {
    if (finError) toast.error(finError instanceof Error ? finError.message : 'Error al cargar finanzas')
  }, [finError])

  const resumen = finData?.resumen
  const resumenPorCategoria = finData?.resumenPorCategoria ?? []
  const cartera = finData?.cartera ?? []
  const egresos = finData?.egresos ?? []

  const porcentajeCobrado = useMemo(() => {
    if (!resumen || resumen.ingresosEsperados <= 0) return 0
    return Math.round((resumen.ingresosCobrados / resumen.ingresosEsperados) * 100)
  }, [resumen])

  const openNewEgreso = () => {
    setEditingEgreso(null)
    setEgresoForm({
      fecha: new Date().toISOString().slice(0, 10),
      concepto: '',
      categoriaGasto: '',
      valor: '',
      responsable: '',
    })
    setIsEgresoDialogOpen(true)
  }

  const openEditEgreso = (e: EgresoRow) => {
    setEditingEgreso(e)
    setEgresoForm({
      fecha: e.fecha.slice(0, 10),
      concepto: e.concepto,
      categoriaGasto: normalizeEgresoCategoriaSelect(e.categoriaGasto),
      valor: String(e.valor),
      responsable: e.responsable,
    })
    setIsEgresoDialogOpen(true)
  }

  const submitEgreso = async () => {
    if (!torneoId) return
    const valor = Number(egresoForm.valor)
    if (!egresoForm.concepto.trim() || !egresoForm.categoriaGasto || Number.isNaN(valor) || valor <= 0) {
      toast.error('Completa concepto, categoría y un valor numérico válido')
      return
    }
    try {
      if (editingEgreso) {
        await updateEgreso({
          id: editingEgreso.id,
          input: {
            fecha: egresoForm.fecha,
            concepto: egresoForm.concepto.trim(),
            categoriaGasto: egresoForm.categoriaGasto,
            valor,
            responsable: egresoForm.responsable.trim() || '—',
          },
        })
        toast.success('Egreso actualizado')
      } else {
        await createEgreso({
          fecha: egresoForm.fecha,
          concepto: egresoForm.concepto.trim(),
          categoriaGasto: egresoForm.categoriaGasto,
          valor,
          responsable: egresoForm.responsable.trim() || '—',
        })
        toast.success('Egreso registrado')
      }
      setIsEgresoDialogOpen(false)
      await refetch()
    } catch (e) {
      toast.error(translateUserError(e, 'finanzas'))
    }
  }

  const confirmDeleteEgreso = async () => {
    if (!deleteEgresoId) return
    try {
      await deleteEgreso(deleteEgresoId)
      toast.success('Egreso eliminado')
      setDeleteEgresoId(null)
      await refetch()
    } catch (e) {
      toast.error(translateUserError(e, 'finanzas'))
    }
  }

  const submitAbono = async () => {
    if (!torneoId) return
    const row = cartera.find((c) => c.equipoId === abonoForm.equipoId)
    const valor = Number(abonoForm.valor)
    if (!row || Number.isNaN(valor) || valor <= 0) {
      toast.error('Selecciona un equipo y un valor válido')
      return
    }
    if (!row.pagoInscripcionId) {
      toast.error(
        'Este equipo no tiene registro de pago de inscripción. Debe crearse al crear el equipo; revisa en Supabase o vuelve a crear el equipo.',
      )
      return
    }
    try {
      await createAbono({
        equipoId: row.equipoId,
        valor,
        concepto: abonoForm.concepto.trim() || 'Abono',
        fecha: abonoForm.fecha,
        pagoInscripcionId: row.pagoInscripcionId,
        medioPago: abonoForm.medioPago,
        referencia: null,
        observaciones: null,
      })
      toast.success('Abono registrado')
      setIsAbonoDialogOpen(false)
      setAbonoForm((f) => ({ ...f, valor: '', equipoId: '', medioPago: 'efectivo' }))
      await refetch()
    } catch (e) {
      toast.error(translateUserError(e, 'finanzas'))
    }
  }

  const logoPlaceholder = (name: string) => name.slice(0, 2).toUpperCase()

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Finanzas" description="Gestión financiera del torneo" />
        <EmptyState
          icon={DollarSign}
          title="Sin torneo activo"
          description="Activa un torneo para ver ingresos, cartera y egresos reales."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Finanzas" description="Gestión financiera del torneo (Supabase)" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:inline-flex lg:w-auto">
          <TabsTrigger value="estado">Estado Financiero</TabsTrigger>
          <TabsTrigger value="tarifas">Tarifas e Inscripciones</TabsTrigger>
          <TabsTrigger value="cartera">Cartera de Cobro</TabsTrigger>
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
        </TabsList>

        <TabsContent value="estado" className="space-y-4">
          {finLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Ingresos Esperados"
                  value={formatCurrency(resumen?.ingresosEsperados ?? 0)}
                  icon={DollarSign}
                />
                <StatCard
                  title="Ingresos Cobrados"
                  value={formatCurrency(resumen?.ingresosCobrados ?? 0)}
                  icon={TrendingUp}
                  variant="success"
                />
                <StatCard
                  title="Cartera Pendiente"
                  value={formatCurrency(resumen?.carteraPendiente ?? 0)}
                  icon={CreditCard}
                  variant="warning"
                />
                <StatCard
                  title="Total Egresos"
                  value={formatCurrency(resumen?.totalEgresos ?? 0)}
                  icon={TrendingDown}
                  variant="danger"
                />
                <StatCard
                  title="Resultado Neto"
                  value={formatCurrency(resumen?.resultado ?? 0)}
                  icon={(resumen?.resultado ?? 0) >= 0 ? TrendingUp : TrendingDown}
                  variant={(resumen?.resultado ?? 0) >= 0 ? 'success' : 'danger'}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Progreso de Recaudo</CardTitle>
                  <CardDescription>
                    {formatCurrency(resumen?.ingresosCobrados ?? 0)} de{' '}
                    {formatCurrency(resumen?.ingresosEsperados ?? 0)} cobrados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Porcentaje cobrado</span>
                      <span className="font-medium">{porcentajeCobrado}%</span>
                    </div>
                    <Progress value={porcentajeCobrado} className="h-3" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumen por Categoría</CardTitle>
                  <CardDescription>Datos desde vw_resumen_financiero_categoria</CardDescription>
                </CardHeader>
                <CardContent>
                  {resumenPorCategoria.length === 0 ? (
                    <EmptyState
                      icon={FileText}
                      title="Sin resumen por categoría"
                      description="Cuando existan categorías con equipos y movimientos, aquí verás el detalle por categoría."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Valor inscripción</TableHead>
                            <TableHead className="text-center">Equipos inscritos</TableHead>
                            <TableHead className="text-right">Esperado</TableHead>
                            <TableHead className="text-right">Cobrado</TableHead>
                            <TableHead className="text-right">Pendiente</TableHead>
                            <TableHead className="text-right">Avance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resumenPorCategoria.map((raw, idx) => {
                            const row = raw as Record<string, unknown>
                            const nombre = String(row.categoria ?? '—')
                            const color = String(row.color ?? '#64748b')
                            const vi = Number(row.valor_inscripcion ?? 0)
                            const eq = Number(row.equipos_inscritos ?? 0)
                            const esp = Number(row.esperado ?? 0)
                            const cob = Number(row.cobrado ?? 0)
                            const pend = Number(row.pendiente ?? 0)
                            const av = Number(row.avance_porcentaje ?? 0)
                            return (
                              <TableRow key={idx}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="font-medium">{nombre}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{formatCurrency(vi)}</TableCell>
                                <TableCell className="text-center">{eq}</TableCell>
                                <TableCell className="text-right">{formatCurrency(esp)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(cob)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(pend)}</TableCell>
                                <TableCell className="text-right">{Math.round(av)}%</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="tarifas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarifas de Inscripción por Categoría</CardTitle>
              <CardDescription>Valores en la tabla categorías (Supabase)</CardDescription>
            </CardHeader>
            <CardContent>
              {catLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : categorias.length === 0 ? (
                <EmptyState
                  icon={DollarSign}
                  title="Sin categorías"
                  description="Crea categorías para definir valor de inscripción y tarifa de arbitraje."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Rango de Edad</TableHead>
                      <TableHead className="text-right">Valor Inscripción</TableHead>
                      <TableHead className="text-right">Tarifa Arbitraje</TableHead>
                      <TableHead className="text-center">Equipos</TableHead>
                      <TableHead className="text-right">Valor esperado (× equipos)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categorias.map((categoria) => {
                      const valorEsperado = categoria.equipos * categoria.valorInscripcion
                      return (
                        <TableRow key={categoria.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoria.color }} />
                              <span className="font-medium">{categoria.nombre}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{categoria.rangoEdad || '—'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(categoria.valorInscripcion)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(categoria.tarifaArbitraje)}</TableCell>
                          <TableCell className="text-center">{categoria.equipos}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(valorEsperado)}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cartera" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cartera de Cobro</CardTitle>
                  <CardDescription>vw_cartera o cálculo desde equipos y abonos</CardDescription>
                </div>
                <Dialog open={isAbonoDialogOpen} onOpenChange={setIsAbonoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!cartera.length || isMutating}>
                      <Plus className="mr-2 h-4 w-4" />
                      Registrar Abono
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Abono</DialogTitle>
                      <DialogDescription>Requiere fila en pagos_inscripcion (se crea al registrar el equipo).</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Equipo</Label>
                        <Select value={abonoForm.equipoId} onValueChange={(v) => setAbonoForm((f) => ({ ...f, equipoId: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar equipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {cartera.map((c) => (
                              <SelectItem key={c.equipoId} value={c.equipoId}>
                                {c.equipoNombre} — saldo {formatCurrency(c.saldo)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor del abono</Label>
                        <Input
                          type="number"
                          value={abonoForm.valor}
                          onChange={(e) => setAbonoForm((f) => ({ ...f, valor: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Concepto</Label>
                        <Input
                          value={abonoForm.concepto}
                          onChange={(e) => setAbonoForm((f) => ({ ...f, concepto: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha de pago</Label>
                        <Input
                          type="date"
                          value={abonoForm.fecha}
                          onChange={(e) => setAbonoForm((f) => ({ ...f, fecha: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Medio de pago</Label>
                        <Select
                          value={abonoForm.medioPago}
                          onValueChange={(v) => setAbonoForm((f) => ({ ...f, medioPago: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="nequi">Nequi</SelectItem>
                            <SelectItem value="daviplata">Daviplata</SelectItem>
                            <SelectItem value="bancolombia">Bancolombia</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAbonoDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => void submitAbono()} disabled={isMutating}>
                        Registrar Abono
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {finLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : cartera.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="Sin equipos en cartera"
                  description="Cuando existan equipos inscritos, podrás ver y cobrar inscripciones aquí."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Abonado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cartera.map((row: CarteraRowUi) => (
                      <TableRow key={row.equipoId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded text-xs font-bold text-white"
                              style={{ backgroundColor: row.equipoColor }}
                            >
                              {logoPlaceholder(row.equipoNombre)}
                            </div>
                            <span className="font-medium">{row.equipoNombre}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{ borderColor: row.categoriaColor, color: row.categoriaColor }}
                          >
                            {row.categoriaNombre}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(row.valorInscripcion)}</TableCell>
                        <TableCell className="text-right font-medium text-success">
                          {formatCurrency(row.totalAbonado)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.saldo > 0 ? (
                            <span className="text-destructive">{formatCurrency(row.saldo)}</span>
                          ) : (
                            <span className="text-success">$0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.estado === 'al_dia' ? (
                            <Badge variant="outline" className="border-success text-success">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Al día
                            </Badge>
                          ) : row.estado === 'pendiente' ? (
                            <Badge variant="outline" className="border-warning text-warning-foreground">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendiente
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Vencido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {row.saldo > 0 && row.pagoInscripcionId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAbonoForm((f) => ({
                                    ...f,
                                    equipoId: row.equipoId,
                                    concepto: 'Abono inscripción',
                                    fecha: new Date().toISOString().slice(0, 10),
                                  }))
                                  setIsAbonoDialogOpen(true)
                                }}
                              >
                                <Plus className="mr-1 h-3 w-3" />
                                Abono
                              </Button>
                            )}
                            {row.saldo > 0 && !row.pagoInscripcionId && (
                              <span className="text-xs text-muted-foreground">Sin registro de inscripción</span>
                            )}
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

        <TabsContent value="egresos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registro de Egresos</CardTitle>
                  <CardDescription>Total egresos: {formatCurrency(resumen?.totalEgresos ?? 0)}</CardDescription>
                </div>
                <Button onClick={openNewEgreso} className="gap-2" disabled={isMutating}>
                  <Plus className="h-4 w-4" />
                  Nuevo Egreso
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Dialog open={isEgresoDialogOpen} onOpenChange={setIsEgresoDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingEgreso ? 'Editar egreso' : 'Registrar egreso'}</DialogTitle>
                    <DialogDescription>Los egresos se guardan en la tabla egresos.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={egresoForm.fecha}
                        onChange={(e) => setEgresoForm((f) => ({ ...f, fecha: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Concepto</Label>
                      <Input
                        value={egresoForm.concepto}
                        onChange={(e) => setEgresoForm((f) => ({ ...f, concepto: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoría del gasto</Label>
                        <Select
                          value={egresoForm.categoriaGasto || undefined}
                          onValueChange={(v) => setEgresoForm((f) => ({ ...f, categoriaGasto: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="infraestructura">Infraestructura</SelectItem>
                            <SelectItem value="material_deportivo">Material deportivo</SelectItem>
                            <SelectItem value="arbitraje">Arbitraje</SelectItem>
                            <SelectItem value="premiacion">Premiación</SelectItem>
                            <SelectItem value="administrativo">Administrativo</SelectItem>
                            <SelectItem value="eventos">Eventos</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          value={egresoForm.valor}
                          onChange={(e) => setEgresoForm((f) => ({ ...f, valor: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Responsable</Label>
                      <Input
                        value={egresoForm.responsable}
                        onChange={(e) => setEgresoForm((f) => ({ ...f, responsable: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEgresoDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => void submitEgreso()} disabled={isMutating}>
                      Guardar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {finLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : egresos.length === 0 ? (
                <EmptyState
                  icon={TrendingDown}
                  title="Sin egresos registrados"
                  description="Registra gastos del torneo para llevar el control financiero."
                  action={
                    <Button onClick={openNewEgreso}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo egreso
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {egresos.map((egreso) => (
                      <TableRow key={egreso.id}>
                        <TableCell className="font-medium">{formatDate(egreso.fecha)}</TableCell>
                        <TableCell>{egreso.concepto}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{labelCategoriaGasto(egreso.categoriaGasto)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-destructive">
                          -{formatCurrency(egreso.valor)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{egreso.responsable}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditEgreso(egreso)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteEgresoId(egreso.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
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
      </Tabs>

      <AlertDialog open={Boolean(deleteEgresoId)} onOpenChange={(o) => !o && setDeleteEgresoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar egreso</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteEgreso()}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
