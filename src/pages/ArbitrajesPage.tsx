import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { useArbitrajes } from '@/features/arbitrajes/useArbitrajes'
import { pickBool, pickNum, pickStr } from '@/features/_shared/supabaseHelpers'
import type { ArbitrajeRowUi } from '@/features/arbitrajes/arbitrajesService'

function rowKeys(rows: ArbitrajeRowUi[]): string[] {
  const first = rows[0]
  if (!first) return []
  return Object.keys(first).filter((k) => !['torneo_id'].includes(k)).slice(0, 12)
}

export function ArbitrajesPage() {
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id
  const { data: categorias = [] } = useCategorias(torneoId)
  const { data, isLoading, error } = useArbitrajes(torneoId)

  useEffect(() => {
    if (error) toast.error(error instanceof Error ? error.message : 'Error al cargar arbitrajes')
  }, [error])

  const lista = data?.lista ?? []
  const resumen = data?.resumen

  const keys = useMemo(() => rowKeys(lista), [lista])

  const filtered = useMemo(() => {
    return lista.filter((row) => {
      const r = row as Record<string, unknown>
      const cid = pickStr(r, 'categoria_id')
      if (filterCategoria !== 'all' && cid && cid !== filterCategoria) return false
      if (filterEstado === 'pagado') {
        const p = String(r.pagado ?? r.pagada ?? '').toLowerCase()
        if (!(p === 'true' || p === '1' || r.estado_pago === 'pagado')) return false
      }
      if (filterEstado === 'pendiente') {
        const p = String(r.pagado ?? r.pagada ?? '').toLowerCase()
        if (p === 'true' || p === '1' || r.estado_pago === 'pagado') return false
      }
      return true
    })
  }, [lista, filterCategoria, filterEstado])

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
        <PageHeader title="Arbitrajes" description="Pagos y control de arbitraje" />
        <EmptyState icon={Calendar} title="Sin torneo activo" description="Activa un torneo para ver arbitrajes." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arbitrajes"
        description="Lista desde arbitrajes y resumen vw_resumen_arbitrajes"
        actions={
          <Button variant="outline" disabled>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Resumen
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Partidos (vista)" value={resumen?.totalPartidos ?? 0} icon={Calendar} />
        <StatCard
          title="Total pagado (vista)"
          value={formatCurrency(resumen?.totalPagado ?? 0)}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Pendiente (vista)"
          value={formatCurrency(resumen?.totalPendiente ?? 0)}
          icon={Clock}
          variant="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado pago</Label>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pagado">Pagado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de arbitrajes</CardTitle>
          <CardDescription>Columnas según la tabla / vista en Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Sin arbitrajes"
              description="No hay filas en arbitrajes para este torneo, o el filtro no coincide con ningún registro."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {keys.map((k) => (
                      <TableHead key={k}>{k.replace(/_/g, ' ')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, idx) => (
                    <TableRow key={idx}>
                      {keys.map((k) => {
                        const v = (row as Record<string, unknown>)[k]
                        const s = v == null ? '—' : typeof v === 'number' ? String(v) : String(v)
                        return <TableCell key={k}>{s}</TableCell>
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifas por categoría</CardTitle>
          <CardDescription>Desde tabla categorias (tarifa_arbitraje)</CardDescription>
        </CardHeader>
        <CardContent>
          {categorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay categorías.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Tarifa arbitraje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.tarifaArbitraje)}</TableCell>
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
