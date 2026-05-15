import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Plus, Eye, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { listFasesPorCategoria } from '@/features/fases/fasesTorneoService'
import {
  estadoActaListado,
  listActasTorneo,
  type ActaEstadoUi,
} from '@/features/actas/actasListadoService'
import { formatDate } from '@/lib/utils'
import { translateUserError } from '@/lib/errorMessages'
import { APP_PATHS } from '@/lib/appPaths'

const ESTADO_LABEL: Record<ActaEstadoUi, string> = {
  sin_acta: 'Sin acta',
  edicion: 'En edición',
  cerrada: 'Cerrada',
}

const ESTADO_VARIANT: Record<ActaEstadoUi, 'secondary' | 'outline' | 'default'> = {
  sin_acta: 'secondary',
  edicion: 'outline',
  cerrada: 'default',
}

export function ActasListadoPage() {
  const navigate = useNavigate()
  const [categoriaId, setCategoriaId] = useState('')
  const [faseId, setFaseId] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<ActaEstadoUi | 'all'>('all')
  const [equipoBusqueda, setEquipoBusqueda] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id
  const { data: categorias = [] } = useCategorias(torneoId)

  useEffect(() => {
    if (categorias.length && !categoriaId) setCategoriaId(categorias[0]!.id)
  }, [categorias, categoriaId])

  useEffect(() => {
    setFaseId('')
  }, [categoriaId])

  const { data: fases = [] } = useQuery({
    queryKey: ['actas-fases', categoriaId],
    enabled: Boolean(categoriaId),
    queryFn: () => listFasesPorCategoria(categoriaId),
  })

  const actasQ = useQuery({
    queryKey: ['actas-listado', torneoId, categoriaId, faseId, estadoFilter, equipoBusqueda],
    enabled: Boolean(torneoId),
    queryFn: () =>
      listActasTorneo(torneoId!, {
        categoriaId: categoriaId || undefined,
        faseId: faseId || undefined,
        equipoNombre: equipoBusqueda || undefined,
        estadoActa: estadoFilter,
      }),
  })

  useEffect(() => {
    if (actasQ.error) toast.error(translateUserError(actasQ.error, 'programacion'))
  }, [actasQ.error])

  const rows = actasQ.data ?? []

  const abrirActa = (partidoId: string, catId: string) => {
    navigate(`${APP_PATHS.acta}?partidoId=${partidoId}&categoriaId=${catId}`)
  }

  const categoriaNombre = useMemo(
    () => categorias.find((c) => c.id === categoriaId)?.nombre,
    [categorias, categoriaId],
  )

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Actas de partido" description="Listado y gestión de actas" />
        <EmptyState icon={FileText} title="Sin torneo activo" description="Selecciona un torneo en Administración de torneos." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actas de partido"
        description={`${torneo?.nombre ?? 'Torneo'} — consulta, edita y exporta actas`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <div className="space-y-1 md:w-48">
            <span className="text-xs text-muted-foreground">Categoría</span>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:w-48">
            <span className="text-xs text-muted-foreground">Fase</span>
            <Select value={faseId || '__all__'} onValueChange={(v) => setFaseId(v === '__all__' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                {fases.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 md:w-40">
            <span className="text-xs text-muted-foreground">Estado acta</span>
            <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as ActaEstadoUi | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sin_acta">Sin acta</SelectItem>
                <SelectItem value="edicion">En edición</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por equipo…"
              value={equipoBusqueda}
              onChange={(e) => setEquipoBusqueda(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {actasQ.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin partidos"
              description={
                categoriaNombre
                  ? `No hay partidos en ${categoriaNombre} con los filtros actuales.`
                  : 'No hay partidos para mostrar.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría / Fase</TableHead>
                  <TableHead>Partido</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const est = estadoActaListado(row)
                  return (
                    <TableRow key={row.partido_id}>
                      <TableCell className="text-sm">
                        {row.fecha ? formatDate(row.fecha) : '—'}
                        {row.hora ? ` ${row.hora}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p>{row.categoria_nombre}</p>
                        {row.fase_nombre && <p className="text-xs text-muted-foreground">{row.fase_nombre}</p>}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.equipo_local_nombre} vs {row.equipo_visitante_nombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ESTADO_VARIANT[est]}>{ESTADO_LABEL[est]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant={est === 'sin_acta' ? 'default' : 'outline'}
                          onClick={() => abrirActa(row.partido_id, row.categoria_id)}
                        >
                          {est === 'sin_acta' ? (
                            <>
                              <Plus className="mr-1 h-4 w-4" />
                              Crear acta
                            </>
                          ) : (
                            <>
                              <Eye className="mr-1 h-4 w-4" />
                              Ver / editar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
