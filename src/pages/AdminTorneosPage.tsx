import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trophy, Plus, Check, Archive } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useTorneoActivo, torneoActivoQueryKey, torneosListQueryKey } from '@/features/torneos/useTorneoActivo'
import { getDashboardCounts } from '@/features/dashboard/dashboardService'
import { listTorneosUsuario, updateTorneo } from '@/features/torneos/torneosService'
import { CrearTorneoDialog } from '@/components/torneos/CrearTorneoDialog'
import { translateUserError } from '@/lib/errorMessages'
import type { EstadoTorneo, TorneoRow } from '@/types/database'
import { formatDate } from '@/lib/utils'

const ESTADO_LABEL: Record<EstadoTorneo, string> = {
  borrador: 'Borrador',
  activo: 'Activo',
  finalizado: 'Finalizado',
  archivado: 'Archivado',
}

function ResumenTorneo({ torneoId }: { torneoId: string }) {
  const q = useQuery({
    queryKey: ['admin-torneo-counts', torneoId],
    queryFn: () => getDashboardCounts(torneoId),
  })
  if (q.isLoading) return <span className="text-xs text-muted-foreground">Cargando…</span>
  if (!q.data) return null
  const c = q.data
  return (
    <span className="text-xs text-muted-foreground">
      {c.categoriasTotal} cat. · {c.equipos} equipos · {c.jugadores} jugadores · {c.partidosJugados}/{c.partidosTotal}{' '}
      partidos jugados
    </span>
  )
}

export function AdminTorneosPage() {
  const qc = useQueryClient()
  const { data: torneoActivo, setTorneoId, selectedTorneoId } = useTorneoActivo()
  const [crearOpen, setCrearOpen] = useState(false)
  const [archivarTarget, setArchivarTarget] = useState<TorneoRow | null>(null)

  const listQ = useQuery({
    queryKey: torneosListQueryKey,
    queryFn: listTorneosUsuario,
  })

  const archivarMut = useMutation({
    mutationFn: (id: string) => updateTorneo(id, { estado: 'archivado' }),
    onSuccess: () => {
      toast.success('Torneo archivado')
      setArchivarTarget(null)
      void qc.invalidateQueries({ queryKey: torneosListQueryKey })
      void qc.invalidateQueries({ queryKey: torneoActivoQueryKey })
    },
    onError: (e) => toast.error(translateUserError(e, 'torneo')),
  })

  const activarMut = useMutation({
    mutationFn: async (id: string) => {
      await updateTorneo(id, { estado: 'activo' })
      setTorneoId(id)
    },
    onSuccess: () => {
      toast.success('Torneo activo actualizado')
      void qc.invalidateQueries({ queryKey: torneosListQueryKey })
    },
    onError: (e) => toast.error(translateUserError(e, 'torneo')),
  })

  const torneos = listQ.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración de torneos"
        description="Gestiona todos tus torneos. La configuración del torneo activo sigue en Configuración."
        actions={
          <Button type="button" onClick={() => setCrearOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear torneo
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Tus torneos
          </CardTitle>
          <CardDescription>
            Torneo en uso: <strong>{torneoActivo?.nombre ?? '—'}</strong>. No se eliminan datos al archivar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listQ.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : torneos.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="Sin torneos"
              description="Crea tu primer torneo para comenzar."
              action={
                <Button type="button" onClick={() => setCrearOpen(true)}>
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
                  <TableHead>Fechas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Resumen</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {torneos.map((t) => {
                  const esActivo = selectedTorneoId === t.id
                  return (
                    <TableRow key={t.id} className={esActivo ? 'bg-primary/5' : undefined}>
                      <TableCell className="font-medium">
                        {t.nombre}
                        {esActivo && (
                          <Badge className="ml-2" variant="default">
                            En uso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.organizacion || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.fecha_inicio ? formatDate(t.fecha_inicio) : '—'} —{' '}
                        {t.fecha_fin ? formatDate(t.fecha_fin) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ESTADO_LABEL[t.estado] ?? t.estado}</Badge>
                      </TableCell>
                      <TableCell>
                        <ResumenTorneo torneoId={t.id} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {!esActivo && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => activarMut.mutate(t.id)}
                            disabled={activarMut.isPending}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Usar
                          </Button>
                        )}
                        {t.estado !== 'archivado' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setArchivarTarget(t)}
                          >
                            <Archive className="mr-1 h-4 w-4" />
                            Archivar
                          </Button>
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

      <CrearTorneoDialog open={crearOpen} onOpenChange={setCrearOpen} />

      <AlertDialog open={Boolean(archivarTarget)} onOpenChange={(o) => !o && setArchivarTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar «{archivarTarget?.nombre}»?</AlertDialogTitle>
            <AlertDialogDescription>
              El torneo quedará archivado. No se borrarán categorías, equipos ni partidos. Podrás seguir consultando
              datos si lo seleccionas como torneo activo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archivarTarget && archivarMut.mutate(archivarTarget.id)}
              disabled={archivarMut.isPending}
            >
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
