import { useState } from 'react'
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
} from 'lucide-react'
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
import { PageHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { 
  categorias, 
  equipos, 
  egresos,
  abonos,
  calcularResumenFinanciero,
  getEquiposByCategoriaId,
} from '@/data/mockData'
import { formatCurrency, formatDate } from '@/lib/utils'

export function FinanzasPage() {
  const [activeTab, setActiveTab] = useState('estado')
  const [isEgresoDialogOpen, setIsEgresoDialogOpen] = useState(false)
  const [isAbonoDialogOpen, setIsAbonoDialogOpen] = useState(false)

  const resumen = calcularResumenFinanciero()
  const porcentajeCobrado = Math.round((resumen.ingresosCobrados / resumen.ingresosEsperados) * 100)

  // Calculate cartera by team
  const cartera = equipos.map(equipo => {
    const categoria = categorias.find(c => c.id === equipo.categoriaId)
    const valorInscripcion = categoria?.valorInscripcion || 0
    const abonosEquipo = abonos.filter(a => a.equipoId === equipo.id)
    const totalAbonado = abonosEquipo.reduce((acc, a) => acc + a.valor, 0)
    const saldo = valorInscripcion - totalAbonado
    const estado = saldo <= 0 ? 'al_dia' : saldo < valorInscripcion ? 'pendiente' : 'vencido'

    return {
      equipo,
      categoria,
      valorInscripcion,
      totalAbonado,
      saldo: Math.max(0, saldo),
      estado,
    }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finanzas"
        description="Gestión financiera del torneo"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="estado">Estado Financiero</TabsTrigger>
          <TabsTrigger value="tarifas">Tarifas e Inscripciones</TabsTrigger>
          <TabsTrigger value="cartera">Cartera de Cobro</TabsTrigger>
          <TabsTrigger value="egresos">Egresos</TabsTrigger>
        </TabsList>

        {/* Estado Financiero */}
        <TabsContent value="estado" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Ingresos Esperados"
              value={formatCurrency(resumen.ingresosEsperados)}
              icon={DollarSign}
            />
            <StatCard
              title="Ingresos Cobrados"
              value={formatCurrency(resumen.ingresosCobrados)}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title="Cartera Pendiente"
              value={formatCurrency(resumen.carteraPendiente)}
              icon={CreditCard}
              variant="warning"
            />
            <StatCard
              title="Total Egresos"
              value={formatCurrency(resumen.totalEgresos)}
              icon={TrendingDown}
              variant="danger"
            />
            <StatCard
              title="Resultado Neto"
              value={formatCurrency(resumen.resultado)}
              icon={resumen.resultado >= 0 ? TrendingUp : TrendingDown}
              variant={resumen.resultado >= 0 ? 'success' : 'danger'}
            />
          </div>

          {/* Collection Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Progreso de Recaudo</CardTitle>
              <CardDescription>
                {formatCurrency(resumen.ingresosCobrados)} de {formatCurrency(resumen.ingresosEsperados)} cobrados
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

          {/* Summary by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen por Categoría</CardTitle>
              <CardDescription>
                Ingresos esperados y cobrados por cada categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center">Equipos</TableHead>
                    <TableHead className="text-right">Valor Inscripción</TableHead>
                    <TableHead className="text-right">Esperado</TableHead>
                    <TableHead className="text-right">Cobrado</TableHead>
                    <TableHead className="text-right">Pendiente</TableHead>
                    <TableHead className="text-center">Avance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorias.map(categoria => {
                    const equiposCat = getEquiposByCategoriaId(categoria.id)
                    const esperado = equiposCat.length * categoria.valorInscripcion
                    const abonosCat = abonos.filter(a => 
                      equiposCat.some(e => e.id === a.equipoId)
                    )
                    const cobrado = abonosCat.reduce((acc, a) => acc + a.valor, 0)
                    const pendiente = esperado - cobrado
                    const avance = esperado > 0 ? Math.round((cobrado / esperado) * 100) : 0

                    return (
                      <TableRow key={categoria.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categoria.color }}
                            />
                            <span className="font-medium">{categoria.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{equiposCat.length}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(categoria.valorInscripcion)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(esperado)}
                        </TableCell>
                        <TableCell className="text-right text-success font-medium">
                          {formatCurrency(cobrado)}
                        </TableCell>
                        <TableCell className="text-right text-warning-foreground font-medium">
                          {formatCurrency(pendiente)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={avance} className="h-2 w-16" />
                            <span className="text-xs text-muted-foreground w-8">
                              {avance}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tarifas e Inscripciones */}
        <TabsContent value="tarifas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tarifas de Inscripción por Categoría</CardTitle>
              <CardDescription>
                Valores establecidos para inscripción de equipos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Rango de Edad</TableHead>
                    <TableHead className="text-right">Valor Inscripción</TableHead>
                    <TableHead className="text-center">Equipos Inscritos</TableHead>
                    <TableHead className="text-right">Valor Esperado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorias.map(categoria => {
                    const equiposCat = getEquiposByCategoriaId(categoria.id)
                    const valorEsperado = equiposCat.length * categoria.valorInscripcion

                    return (
                      <TableRow key={categoria.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: categoria.color }}
                            />
                            <span className="font-medium">{categoria.nombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {categoria.rangoEdad}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(categoria.valorInscripcion)}
                        </TableCell>
                        <TableCell className="text-center">{equiposCat.length}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(valorEsperado)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cartera de Cobro */}
        <TabsContent value="cartera" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cartera de Cobro</CardTitle>
                  <CardDescription>
                    Estado de pagos por equipo
                  </CardDescription>
                </div>
                <Dialog open={isAbonoDialogOpen} onOpenChange={setIsAbonoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Registrar Abono
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Abono</DialogTitle>
                      <DialogDescription>
                        Registra un pago o abono de un equipo
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Equipo</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar equipo" />
                          </SelectTrigger>
                          <SelectContent>
                            {equipos.map(eq => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor del abono</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Concepto</Label>
                        <Input placeholder="Ej: Pago parcial inscripción" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAbonoDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => setIsAbonoDialogOpen(false)}>
                        Registrar Abono
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
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
                  {cartera.map(({ equipo, categoria, valorInscripcion, totalAbonado, saldo, estado }) => (
                    <TableRow key={equipo.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex h-8 w-8 items-center justify-center rounded text-white text-xs font-bold"
                            style={{ backgroundColor: equipo.color }}
                          >
                            {equipo.logoPlaceholder}
                          </div>
                          <span className="font-medium">{equipo.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          style={{ borderColor: categoria?.color, color: categoria?.color }}
                        >
                          {categoria?.nombre}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(valorInscripcion)}
                      </TableCell>
                      <TableCell className="text-right text-success font-medium">
                        {formatCurrency(totalAbonado)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {saldo > 0 ? (
                          <span className="text-destructive">{formatCurrency(saldo)}</span>
                        ) : (
                          <span className="text-success">$0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {estado === 'al_dia' ? (
                          <Badge variant="outline" className="text-success border-success">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Al día
                          </Badge>
                        ) : estado === 'pendiente' ? (
                          <Badge variant="outline" className="text-warning-foreground border-warning">
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
                          {saldo > 0 && (
                            <Button variant="outline" size="sm">
                              <Plus className="h-3 w-3 mr-1" />
                              Abono
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <FileText className="h-3 w-3 mr-1" />
                            Cuenta
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

        {/* Egresos */}
        <TabsContent value="egresos" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registro de Egresos</CardTitle>
                  <CardDescription>
                    Total egresos: {formatCurrency(resumen.totalEgresos)}
                  </CardDescription>
                </div>
                <Dialog open={isEgresoDialogOpen} onOpenChange={setIsEgresoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nuevo Egreso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar Egreso</DialogTitle>
                      <DialogDescription>
                        Agrega un nuevo gasto al registro
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input type="date" />
                      </div>
                      <div className="space-y-2">
                        <Label>Concepto</Label>
                        <Input placeholder="Descripción del gasto" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Categoría del gasto</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="infraestructura">Infraestructura</SelectItem>
                              <SelectItem value="material">Material deportivo</SelectItem>
                              <SelectItem value="arbitraje">Arbitraje</SelectItem>
                              <SelectItem value="premiacion">Premiación</SelectItem>
                              <SelectItem value="administrativo">Administrativo</SelectItem>
                              <SelectItem value="eventos">Eventos</SelectItem>
                              <SelectItem value="otros">Otros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Valor</Label>
                          <Input type="number" placeholder="0" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Responsable</Label>
                        <Input placeholder="Nombre del responsable" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEgresoDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={() => setIsEgresoDialogOpen(false)}>
                        Registrar Egreso
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Responsable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {egresos.map((egreso) => (
                    <TableRow key={egreso.id}>
                      <TableCell className="font-medium">
                        {formatDate(egreso.fecha)}
                      </TableCell>
                      <TableCell>{egreso.concepto}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{egreso.categoriaGasto}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        -{formatCurrency(egreso.valor)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {egreso.responsable}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
