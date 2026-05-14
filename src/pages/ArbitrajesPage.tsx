import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Printer, CheckCircle, Clock, DollarSign, Calendar, Filter, Plus } from 'lucide-react'
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
import { translateUserError } from '@/lib/errorMessages'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { useArbitrajes, arbitrajesQueryKey } from '@/features/arbitrajes/useArbitrajes'
import { pickStr } from '@/features/_shared/supabaseHelpers'
import type { ArbitrajeRowUi } from '@/features/arbitrajes/arbitrajesService'
import { crearArbitrajeSiNoExiste } from '@/features/arbitrajes/arbitrajesService'

function rowKeys(rows: ArbitrajeRowUi[]): string[] {
  const first = rows[0]
  if (!first) return []
  return Object.keys(first).filter((k) => !['torneo_id'].includes(k)).slice(0, 14)
}

export function ArbitrajesPage() {
  const qc = useQueryClient()
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id
  const { data: categorias = [] } = useCategorias(torneoId)
  const { data, isLoading, error } = useArbitrajes(torneoId)

  useEffect(() => {
    if (error) toast.error(translateUserError(error, 'finanzas'))
  }, [error])

  const lista = data?.lista ?? []
  const desdeActas = data?.desdeActas ?? []
  const resumen = data?.resumen

  const fuente = desdeActas.length ? desdeActas : lista
  const keys = useMemo(() => rowKeys(fuente), [fuente])

  const filtered = useMemo(() => {
    return fuente.filter((row) => {
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
  }, [fuente, filterCategoria, filterEstado])

  const tarifaPorCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of categorias) m.set(c.id, c.tarifaArbitraje)
    return m
  }, [categorias])

  const registrarArbitraje = async (row: ArbitrajeRowUi) => {
    if (!torneoId) return
    const r = row as Record<string, unknown>
    const partidoId = pickStr(r, 'partido_id')
    const catId = pickStr(r, 'categoria_id')
    if (!partidoId) {
      toast.error('No se pudo identificar el partido en la vista.')
      return
    }
    const valor = tarifaPorCategoria.get(catId) ?? pickNumSafe(r, 'valor_arbitraje', 'tarifa_arbitraje', 'valor')
    if (!valor || valor <= 0) {
      toast.error('Define la tarifa de arbitraje en la categoría antes de registrar.')
      return
    }
    try {
      await crearArbitrajeSiNoExiste({ torneo_id: torneoId, partido_id: partidoId, valor })
      toast.success('Arbitraje registrado.')
      void qc.invalidateQueries({ queryKey: arbitrajesQueryKey(torneoId) })
    } catch (e) {
      toast.error(translateUserError(e, 'finanzas'))
    }
  }

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
        description="Partidos con acta (vista vw_actas_partido_detalle) y registros en arbitrajes."
        actions={
          <Button variant="outline" disabled>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir resumen
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Partidos (vista resumen)" value={resumen?.totalPartidos ?? 0} icon={Calendar} />
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
          <CardTitle>Desde actas / arbitrajes</CardTitle>
          <CardDescription>
            Si la vista de actas está disponible, se muestran esas filas; si no, la tabla arbitrajes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Sin datos"
              description="No hay actas con detalle ni filas en arbitrajes que coincidan con el filtro."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {desdeActas.length > 0 && <TableHead className="w-[1%]">Acción</TableHead>}
                    {keys.map((k) => (
                      <TableHead key={k}>{k.replace(/_/g, ' ')}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, idx) => {
                    const r = row as Record<string, unknown>
                    const partidoId = pickStr(r, 'partido_id')
                    const tieneArbitraje = lista.some(
                      (a) => pickStr(a as Record<string, unknown>, 'partido_id') === partidoId,
                    )
                    return (
                      <TableRow key={idx}>
                        {desdeActas.length > 0 && (
                          <TableCell>
                            {!tieneArbitraje && partidoId ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => void registrarArbitraje(row)}>
                                <Plus className="mr-1 h-4 w-4" />
                                Registrar
                              </Button>
                            ) : tieneArbitraje ? (
                              <Badge variant="secondary">Registrado</Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        )}
                        {keys.map((k) => {
                          const v = r[k]
                          const s = v == null ? '—' : typeof v === 'number' ? String(v) : String(v)
                          return <TableCell key={k}>{s}</TableCell>
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tarifas por categoría</CardTitle>
          <CardDescription>Se usan al crear un registro de arbitraje desde un partido con acta.</CardDescription>
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

function pickNumSafe(r: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = r[k]
    if (v != null && v !== '') {
      const n = Number(v)
      if (!Number.isNaN(n)) return n
    }
  }
  return 0
}
