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

function partidoLabel(row: Record<string, unknown>, kind: 'local' | 'visitante'): string {
  return kind === 'local'
    ? pickStr(row, 'equipo_local', 'equipo_local_nombre', 'local', 'nombre_local')
    : pickStr(row, 'equipo_visitante', 'equipo_visitante_nombre', 'visitante', 'nombre_visitante')
}

function faseLabel(row: Record<string, unknown>): string {
  return pickStr(row, 'fase_nombre', 'fase', 'nombre_fase') || '-'
}

function categoriaLabel(row: Record<string, unknown>): string {
  return pickStr(row, 'categoria', 'categoria_nombre', 'nombre_categoria') || '-'
}

function jornadaLabel(row: Record<string, unknown>): string {
  return pickStr(row, 'jornada') || '-'
}

function pickNumSafe(row: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = row[key]
    if (value != null && value !== '') {
      const num = Number(value)
      if (!Number.isNaN(num)) return num
    }
  }
  return 0
}

export function ArbitrajesPage() {
  const qc = useQueryClient()
  const [filterCategoria, setFilterCategoria] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [registrandoPartidoId, setRegistrandoPartidoId] = useState<string | null>(null)

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id
  const { data: categorias = [] } = useCategorias(torneoId)
  const { data, isLoading, error } = useArbitrajes(torneoId)

  useEffect(() => {
    if (error) toast.error(translateUserError(error, 'default'))
  }, [error])

  const lista = data?.lista ?? []
  const desdeActas = data?.desdeActas ?? []
  const resumen = data?.resumen
  const fuente = desdeActas.length ? desdeActas : lista

  const filtered = useMemo(() => {
    return fuente.filter((row) => {
      const record = row as Record<string, unknown>
      const categoriaId = pickStr(record, 'categoria_id')
      if (filterCategoria !== 'all' && categoriaId && categoriaId !== filterCategoria) return false
      if (filterEstado === 'pagado') {
        const pago = String(record.pagado ?? record.pagada ?? '').toLowerCase()
        if (!(pago === 'true' || pago === '1' || record.estado_pago === 'pagado')) return false
      }
      if (filterEstado === 'pendiente') {
        const pago = String(record.pagado ?? record.pagada ?? '').toLowerCase()
        if (pago === 'true' || pago === '1' || record.estado_pago === 'pagado') return false
      }
      return true
    })
  }, [fuente, filterCategoria, filterEstado])

  const tarifaPorCategoria = useMemo(() => {
    const map = new Map<string, number>()
    for (const categoria of categorias) map.set(categoria.id, categoria.tarifaArbitraje)
    return map
  }, [categorias])

  const registrarArbitraje = async (row: ArbitrajeRowUi) => {
    if (!torneoId) return
    const record = row as Record<string, unknown>
    const partidoId = pickStr(record, 'partido_id')
    const categoriaId = pickStr(record, 'categoria_id')
    if (!partidoId) {
      toast.error('No se pudo identificar el partido en la vista.')
      return
    }

    const valor = tarifaPorCategoria.get(categoriaId) ?? pickNumSafe(record, 'valor_arbitraje', 'tarifa_arbitraje', 'valor')
    if (!valor || valor <= 0) {
      toast.error('Define la tarifa de arbitraje en la categoría antes de registrar.')
      return
    }

    try {
      setRegistrandoPartidoId(partidoId)
      await crearArbitrajeSiNoExiste({ torneo_id: torneoId, partido_id: partidoId, valor })
      toast.success('Arbitraje registrado.')
      void qc.invalidateQueries({ queryKey: arbitrajesQueryKey(torneoId) })
    } catch (error) {
      console.error('Error registrando arbitraje', { torneoId, partidoId, valor, error })
      toast.error('No se pudo registrar el arbitraje. Revisa la tarifa y los datos del partido.')
    } finally {
      setRegistrandoPartidoId(null)
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
        description="Pagos y control de arbitraje"
        actions={
          <Button variant="outline" disabled>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir resumen
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Partidos" value={resumen?.totalPartidos ?? 0} icon={Calendar} />
        <StatCard
          title="Total pagado"
          value={formatCurrency(resumen?.totalPagado ?? 0)}
          icon={CheckCircle}
          variant="success"
        />
        <StatCard
          title="Pendiente"
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
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
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
          <CardDescription>Partidos con acta listos para registrar o consultar arbitraje.</CardDescription>
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
                    <TableHead>Jornada</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Equipo local</TableHead>
                    <TableHead>Equipo visitante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, idx) => {
                    const record = row as Record<string, unknown>
                    const partidoId = pickStr(record, 'partido_id')
                    const tieneArbitraje = lista.some(
                      (arbitraje) => pickStr(arbitraje as Record<string, unknown>, 'partido_id') === partidoId,
                    )
                    return (
                      <TableRow key={`${partidoId || idx}`}>
                        {desdeActas.length > 0 && (
                          <TableCell>
                            {!tieneArbitraje && partidoId ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={registrandoPartidoId === partidoId}
                                onClick={() => void registrarArbitraje(row)}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                {registrandoPartidoId === partidoId ? 'Registrando...' : 'Registrar'}
                              </Button>
                            ) : tieneArbitraje ? (
                              <Badge variant="secondary">Registrado</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )}
                        <TableCell>{jornadaLabel(record)}</TableCell>
                        <TableCell>{faseLabel(record)}</TableCell>
                        <TableCell>{categoriaLabel(record)}</TableCell>
                        <TableCell className="font-medium">{partidoLabel(record, 'local') || '-'}</TableCell>
                        <TableCell className="font-medium">{partidoLabel(record, 'visitante') || '-'}</TableCell>
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
                {categorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: categoria.color }} />
                        {categoria.nombre}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(categoria.tarifaArbitraje)}</TableCell>
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
