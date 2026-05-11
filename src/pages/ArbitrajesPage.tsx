import { useState } from 'react'
import { Printer, CheckCircle, Clock, DollarSign, Calendar, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  arbitrajePagos,
  partidos,
  arbitros,
  getEquipoById,
  getCategoriaById,
  getArbitroById,
  calcularResumenArbitrajes,
} from '@/data/mockData'
import { formatCurrency, formatDate } from '@/lib/utils'

export function ArbitrajesPage() {
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterMes, setFilterMes] = useState('all')

  const resumen = calcularResumenArbitrajes()

  // Get detailed arbitraje data
  const arbitrajeData = arbitrajePagos.map(ap => {
    const partido = partidos.find(p => p.id === ap.partidoId)
    const arbitro = getArbitroById(ap.arbitroId)
    const local = partido ? getEquipoById(partido.equipoLocalId) : null
    const visitante = partido ? getEquipoById(partido.equipoVisitanteId) : null
    const categoria = partido ? getCategoriaById(partido.categoriaId) : null

    return {
      ...ap,
      partido,
      arbitro,
      local,
      visitante,
      categoria,
    }
  })

  // Apply filters
  const filteredData = arbitrajeData.filter(item => {
    if (filterCategoria !== 'all' && item.categoria?.id !== filterCategoria) return false
    if (filterEstado === 'pagado' && !item.pagado) return false
    if (filterEstado === 'pendiente' && item.pagado) return false
    return true
  })

  // Tarifas por categoría
  const tarifas = categorias.map(cat => ({
    categoria: cat,
    tarifa: cat.nombre.includes('Sub-5') || cat.nombre.includes('Sub-7') ? 50000 :
            cat.nombre.includes('Sub-9') || cat.nombre.includes('Sub-11') ? 60000 :
            cat.nombre.includes('Sub-13') || cat.nombre.includes('Sub-15') ? 70000 : 80000,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arbitrajes"
        description="Gestión de pagos y tarifas de arbitraje"
        actions={
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Resumen
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Partidos Arbitrados"
          value={resumen.totalPartidosArbitrados}
          icon={Calendar}
        />
        <StatCard
          title="Total Pagado"
          value={formatCurrency(resumen.totalPagado)}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Pendiente por Pagar"
          value={formatCurrency(resumen.totalPendiente)}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Tarifas */}
      <Card>
        <CardHeader>
          <CardTitle>Tarifas de Arbitraje por Categoría</CardTitle>
          <CardDescription>
            Valores establecidos para pago de árbitros según categoría
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            {tarifas.map(({ categoria, tarifa }) => (
              <div 
                key={categoria.id}
                className="flex flex-col items-center p-4 rounded-lg bg-muted/50 border"
              >
                <div 
                  className="w-4 h-4 rounded-full mb-2"
                  style={{ backgroundColor: categoria.color }}
                />
                <span className="text-sm font-medium">{categoria.nombre}</span>
                <span className="text-lg font-bold text-primary mt-1">
                  {formatCurrency(tarifa)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Mes</Label>
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los meses</SelectItem>
                  <SelectItem value="2024-03">Marzo 2024</SelectItem>
                  <SelectItem value="2024-02">Febrero 2024</SelectItem>
                  <SelectItem value="2024-01">Enero 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Categoría</Label>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categorias.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-2 block">Estado</Label>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pagado">Pagados</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Arbitrajes</CardTitle>
          <CardDescription>
            Lista de partidos arbitrados y estado de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Partido</TableHead>
                <TableHead>Árbitro</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.partido ? formatDate(item.partido.fecha) : '-'}
                  </TableCell>
                  <TableCell>
                    {item.categoria && (
                      <Badge 
                        variant="outline"
                        style={{ borderColor: item.categoria.color, color: item.categoria.color }}
                      >
                        {item.categoria.nombre}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.local && item.visitante ? (
                        <>
                          <span className="text-sm">{item.local.nombre}</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-sm">{item.visitante.nombre}</span>
                        </>
                      ) : (
                        '-'
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{item.arbitro?.nombre}</p>
                      <p className="text-xs text-muted-foreground">{item.arbitro?.escuelaArbitral}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.valor)}
                  </TableCell>
                  <TableCell>
                    {item.pagado ? (
                      <Badge variant="outline" className="text-success border-success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Pagado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning-foreground border-warning">
                        <Clock className="mr-1 h-3 w-3" />
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!item.pagado && (
                      <Button variant="outline" size="sm">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Marcar Pagado
                      </Button>
                    )}
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
