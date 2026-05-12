import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, ArrowLeft } from 'lucide-react'
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
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { usePartidosTorneo } from '@/features/partidos/usePartidosTorneo'
import { getEquipoById } from '@/features/equipos/equiposService'
import { getJugadoresByEquipo } from '@/features/jugadores/jugadoresService'
import { useCategorias } from '@/features/categorias/useCategorias'
import { supabase } from '@/lib/supabase'
import { isJugadoEstado } from '@/features/partidos/partidosUi'

interface ActaPartidoPageProps {
  onBack?: () => void
}

export function ActaPartidoPage({ onBack }: ActaPartidoPageProps) {
  const [selectedPartido, setSelectedPartido] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id
  const { data: bundle, isLoading: parLoading, error: parError } = usePartidosTorneo(torneoId)

  const partidosLista = useMemo(() => {
    const programados = bundle?.programados ?? []
    const fix = bundle?.fixture ?? []
    const progIds = new Set(programados.map((p) => p.id))
    return fix.filter((p) => progIds.has(p.id) || isJugadoEstado(p.estado))
  }, [bundle])

  const { data: categorias = [] } = useCategorias(torneoId)

  const partido = partidosLista.find((p) => p.id === selectedPartido)

  const equiposQ = useQuery({
    queryKey: ['acta-equipos', partido?.equipoLocalId, partido?.equipoVisitanteId],
    enabled: Boolean(partido?.equipoLocalId && partido?.equipoVisitanteId),
    queryFn: async () => {
      const [a, b] = await Promise.all([
        getEquipoById(partido!.equipoLocalId!),
        getEquipoById(partido!.equipoVisitanteId!),
      ])
      return { local: a, visitante: b }
    },
  })

  const jugLocalQ = useQuery({
    queryKey: ['acta-jug-local', partido?.equipoLocalId, partido?.categoriaId],
    enabled: Boolean(partido?.equipoLocalId && partido?.categoriaId),
    queryFn: () => getJugadoresByEquipo(partido!.equipoLocalId!, partido!.categoriaId),
  })

  const jugVisQ = useQuery({
    queryKey: ['acta-jug-vis', partido?.equipoVisitanteId, partido?.categoriaId],
    enabled: Boolean(partido?.equipoVisitanteId && partido?.categoriaId),
    queryFn: () => getJugadoresByEquipo(partido!.equipoVisitanteId!, partido!.categoriaId),
  })

  const arbitrosQ = useQuery({
    queryKey: ['acta-arbitros', torneoId],
    enabled: Boolean(torneoId),
    queryFn: async () => {
      const r = await supabase.from('arbitros').select('id, nombre_completo, nombres, apellidos').limit(200)
      if (r.error) return [] as { id: string; label: string }[]
      const rows = (r.data ?? []) as Record<string, unknown>[]
      return rows.map((row) => ({
        id: String(row.id ?? ''),
        label: String(row.nombre_completo ?? row.nombres ?? row.id ?? ''),
      }))
    },
  })

  useEffect(() => {
    if (parError) toast.error(parError instanceof Error ? parError.message : 'Error al cargar partidos')
  }, [parError])

  useEffect(() => {
    if (partidosLista.length && !selectedPartido) setSelectedPartido(partidosLista[0]!.id)
  }, [partidosLista, selectedPartido])

  const localRow = equiposQ.data?.local
  const visitRow = equiposQ.data?.visitante
  const categoria = categorias.find((c) => c.id === partido?.categoriaId)

  const localColor = localRow?.color ?? '#64748b'
  const visitColor = visitRow?.color ?? '#64748b'
  const localNombre = localRow?.nombre ?? partido?.equipoLocalNombre ?? 'Local'
  const visitNombre = visitRow?.nombre ?? partido?.equipoVisitanteNombre ?? 'Visitante'
  const localPh = (localRow?.sigla ?? localNombre).toString().slice(0, 2).toUpperCase()
  const visitPh = (visitRow?.sigla ?? visitNombre).toString().slice(0, 2).toUpperCase()

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
        <PageHeader title="Acta de Partido" description="Registro de partido" />
        <EmptyState icon={Save} title="Sin torneo activo" description="Activa un torneo para usar el acta." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acta de Partido"
        description="Selecciona un partido real del fixture. El guardado en goles/tarjetas se conectará después."
        actions={
          <div className="flex gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            )}
            <Button type="button" variant="secondary" disabled>
              <Save className="mr-2 h-4 w-4" />
              Guardar Acta
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <Label className="mb-2 block text-xs text-muted-foreground">Seleccionar Partido</Label>
          {parLoading ? (
            <Skeleton className="h-10 w-96" />
          ) : partidosLista.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay partidos programados o jugados en Supabase.</p>
          ) : (
            <Select value={selectedPartido} onValueChange={setSelectedPartido}>
              <SelectTrigger className="w-full md:w-96">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {partidosLista.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {p.categoriaNombre}
                      </Badge>
                      {p.equipoLocalNombre} vs {p.equipoVisitanteNombre}
                      {p.fecha ? ` — ${formatDate(p.fecha)}` : ''}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {partido && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Información del Partido</CardTitle>
                  <CardDescription>
                    {partido.fecha ? formatDate(partido.fecha) : 'Sin fecha'} — {partido.hora || '—'} —{' '}
                    {partido.cancha || '—'}
                  </CardDescription>
                </div>
                <Badge variant="outline" style={{ borderColor: categoria?.color, color: categoria?.color }}>
                  {categoria?.nombre ?? partido.categoriaNombre}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {equiposQ.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="flex items-center justify-center gap-8 py-6">
                  <div className="text-center">
                    <div
                      className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg text-xl font-bold text-white"
                      style={{ backgroundColor: localColor }}
                    >
                      {localPh}
                    </div>
                    <p className="font-semibold">{localNombre}</p>
                    <p className="text-xs text-muted-foreground">Local</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-5xl font-bold">{partido.golesLocal ?? '—'}</p>
                    <span className="text-2xl text-muted-foreground">-</span>
                    <p className="text-5xl font-bold">{partido.golesVisitante ?? '—'}</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-lg text-xl font-bold text-white"
                      style={{ backgroundColor: visitColor }}
                    >
                      {visitPh}
                    </div>
                    <p className="font-semibold">{visitNombre}</p>
                    <p className="text-xs text-muted-foreground">Visitante</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jugadores locales</CardTitle>
                <CardDescription>Membresía activa (jugador_equipos)</CardDescription>
              </CardHeader>
              <CardContent>
                {jugLocalQ.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (jugLocalQ.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin jugadores activos en el equipo local.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {jugLocalQ.data!.map((j) => (
                      <li key={j.id}>
                        {j.nombre} — {j.documento}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Jugadores visitantes</CardTitle>
                <CardDescription>Membresía activa (jugador_equipos)</CardDescription>
              </CardHeader>
              <CardContent>
                {jugVisQ.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (jugVisQ.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin jugadores activos en el equipo visitante.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {jugVisQ.data!.map((j) => (
                      <li key={j.id}>
                        {j.nombre} — {j.documento}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Árbitro (catálogo Supabase)</CardTitle>
            </CardHeader>
            <CardContent className="max-w-md">
              {arbitrosQ.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (arbitrosQ.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No hay árbitros en la tabla arbitros (o sin permisos de lectura).</p>
              ) : (
                <Select disabled>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar árbitro (pendiente guardado)" />
                  </SelectTrigger>
                  <SelectContent>
                    {arbitrosQ.data!.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
