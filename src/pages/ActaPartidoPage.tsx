import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { translateUserError } from '@/lib/errorMessages'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { getEquipoById } from '@/features/equipos/equiposService'
import { getJugadoresByEquipo } from '@/features/jugadores/jugadoresService'
import { supabase } from '@/lib/supabase'
import {
  getOrCreateActa,
  guardarActaCompleta,
  listGolesPartido,
  listPartidosParaActa,
  listTarjetasPartido,
} from '@/features/actas/actaPartidoService'
import type { PartidoListaUi } from '@/features/partidos/partidosService'
import { partidosTorneoQueryKey } from '@/features/partidos/usePartidosTorneo'

interface ActaPartidoPageProps {
  onBack?: () => void
}

type GolForm = { tempId: string; jugador_id: string; equipo_id: string; minuto: string }
type TarjForm = { tempId: string; jugador_id: string; tipo: 'amarilla' | 'roja' }

export function ActaPartidoPage({ onBack }: ActaPartidoPageProps) {
  const qc = useQueryClient()
  const [categoriaId, setCategoriaId] = useState('')
  const [partidoId, setPartidoId] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)

  const partidosQ = useQuery({
    queryKey: ['acta-partidos', torneoId, categoriaId],
    enabled: Boolean(torneoId && categoriaId),
    queryFn: () => listPartidosParaActa(torneoId!, categoriaId),
  })

  const partidosLista = partidosQ.data ?? []
  const partido = partidosLista.find((p) => p.id === partidoId)

  const actaQ = useQuery({
    queryKey: ['acta', partidoId],
    enabled: Boolean(partidoId),
    queryFn: () => getOrCreateActa(partidoId),
  })

  const golesInitQ = useQuery({
    queryKey: ['acta-goles', partidoId],
    enabled: Boolean(partidoId),
    queryFn: () => listGolesPartido(partidoId),
  })

  const tarjetasInitQ = useQuery({
    queryKey: ['acta-tarjetas', partidoId],
    enabled: Boolean(partidoId),
    queryFn: () => listTarjetasPartido(partidoId),
  })

  const [arbitroId, setArbitroId] = useState<string>('')
  const [observaciones, setObservaciones] = useState('')
  const [golesForm, setGolesForm] = useState<GolForm[]>([])
  const [tarjetasForm, setTarjetasForm] = useState<TarjForm[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (categorias.length && !categoriaId) {
      setCategoriaId(categorias[0]!.id)
    }
  }, [categorias, categoriaId])

  useEffect(() => {
    if (partidosLista.length && !partidoId) {
      setPartidoId(partidosLista[0]!.id)
      return
    }
    if (partidoId && partidosLista.length && !partidosLista.some((p) => p.id === partidoId)) {
      setPartidoId(partidosLista[0]?.id ?? '')
    }
  }, [partidosLista, partidoId])

  useEffect(() => {
    if (!actaQ.data) return
    setArbitroId(actaQ.data.arbitro_id ?? '')
    setObservaciones(actaQ.data.observaciones ?? '')
  }, [partidoId, actaQ.data])

  useEffect(() => {
    if (!golesInitQ.data) return
    setGolesForm(
      golesInitQ.data.map((g) => ({
        tempId: g.id ?? crypto.randomUUID(),
        jugador_id: g.jugador_id,
        equipo_id: g.equipo_id,
        minuto: g.minuto != null ? String(g.minuto) : '',
      })),
    )
  }, [golesInitQ.data])

  useEffect(() => {
    if (!tarjetasInitQ.data) return
    setTarjetasForm(
      tarjetasInitQ.data.map((t) => ({
        tempId: t.id ?? crypto.randomUUID(),
        jugador_id: t.jugador_id,
        tipo: t.tipo === 'roja' ? 'roja' : 'amarilla',
      })),
    )
  }, [tarjetasInitQ.data])

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

  const localRow = equiposQ.data?.local
  const visitRow = equiposQ.data?.visitante
  const categoria = categorias.find((c) => c.id === partido?.categoriaId)

  const localColor = localRow?.color ?? '#64748b'
  const visitColor = visitRow?.color ?? '#64748b'
  const localNombre = localRow?.nombre ?? partido?.equipoLocalNombre ?? 'Local'
  const visitNombre = visitRow?.nombre ?? partido?.equipoVisitanteNombre ?? 'Visitante'
  const localPh = (localRow?.sigla ?? localNombre).toString().slice(0, 2).toUpperCase()
  const visitPh = (visitRow?.sigla ?? visitNombre).toString().slice(0, 2).toUpperCase()

  const marcador = useMemo(() => {
    const el = partido?.equipoLocalId
    const ev = partido?.equipoVisitanteId
    if (!el || !ev) return { local: 0, vis: 0 }
    let local = 0
    let vis = 0
    for (const g of golesForm) {
      if (g.equipo_id === el) local++
      else if (g.equipo_id === ev) vis++
    }
    return { local, vis }
  }, [golesForm, partido?.equipoLocalId, partido?.equipoVisitanteId])

  const jugadoresOpciones = useMemo(() => {
    const jl = jugLocalQ.data ?? []
    const jv = jugVisQ.data ?? []
    return [
      ...jl.map((j) => ({ id: j.id, label: `${j.nombre} (local)`, equipoId: partido?.equipoLocalId! })),
      ...jv.map((j) => ({ id: j.id, label: `${j.nombre} (visitante)`, equipoId: partido?.equipoVisitanteId! })),
    ]
  }, [jugLocalQ.data, jugVisQ.data, partido?.equipoLocalId, partido?.equipoVisitanteId])

  const invalidatePartidos = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: partidosTorneoQueryKey(torneoId) })
  }

  const guardar = async () => {
    if (!partido || !actaQ.data) return
    const el = partido.equipoLocalId
    const ev = partido.equipoVisitanteId
    if (!el || !ev) return

    setSaving(true)
    try {
      const golesPayload = golesForm
        .filter((g) => g.jugador_id && g.equipo_id)
        .map((g) => ({
          jugador_id: g.jugador_id,
          equipo_id: g.equipo_id,
          minuto: g.minuto.trim() ? Number(g.minuto) : null,
        }))

      const tarPayload = tarjetasForm
        .filter((t) => t.jugador_id)
        .map((t) => ({
          jugador_id: t.jugador_id,
          tipo: t.tipo,
        }))

      await guardarActaCompleta({
        actaId: actaQ.data.id,
        partidoId: partido.id,
        equipoLocalId: el,
        equipoVisitanteId: ev,
        arbitro_id: arbitroId || null,
        observaciones: observaciones.trim() || null,
        goles: golesPayload,
        tarjetas: tarPayload,
        tieneProgramacion: Boolean(partido.programacionId),
      })
      toast.success('Acta guardada')
      void actaQ.refetch()
      void golesInitQ.refetch()
      void tarjetasInitQ.refetch()
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'programacion'))
    } finally {
      setSaving(false)
    }
  }

  const addGol = () => {
    const el = partido?.equipoLocalId
    if (!el) return
    setGolesForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), jugador_id: '', equipo_id: el, minuto: '' },
    ])
  }

  const addTarjeta = () => {
    setTarjetasForm((prev) => [...prev, { tempId: crypto.randomUUID(), jugador_id: '', tipo: 'amarilla' }])
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
        <PageHeader title="Acta de Partido" description="Registro de partido" />
        <EmptyState icon={Save} title="Sin torneo activo" description="Activa un torneo para usar el acta." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acta de Partido"
        description="Selecciona categoría y un partido programado o jugado. El marcador se calcula con los goles registrados."
        actions={
          <div className="flex gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            )}
            <Button type="button" onClick={() => void guardar()} disabled={saving || !partido}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar acta'}
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoría</Label>
              {catLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay categorías.</p>
              ) : (
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
              )}
            </div>
            <div className="space-y-2">
              <Label>Partido</Label>
              {partidosQ.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : partidosLista.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay partidos programados en esta categoría.</p>
              ) : (
                <Select value={partidoId} onValueChange={setPartidoId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partidosLista.map((p: PartidoListaUi) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.equipoLocalNombre} vs {p.equipoVisitanteNombre}
                        {p.fecha ? ` — ${formatDate(p.fecha)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {partido && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Información del partido</CardTitle>
                  <CardDescription>
                    {partido.fecha ? formatDate(partido.fecha) : 'Fecha por definir'} — {partido.hora || '—'} —{' '}
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
                    <p className="text-5xl font-bold">{marcador.local}</p>
                    <span className="text-2xl text-muted-foreground">-</span>
                    <p className="text-5xl font-bold">{marcador.vis}</p>
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Goles</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addGol}>
                  <Plus className="mr-1 h-4 w-4" />
                  Gol
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {golesForm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin goles registrados.</p>
                ) : (
                  golesForm.map((g) => (
                    <div key={g.tempId} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                      <div className="min-w-[140px] flex-1 space-y-1">
                        <Label className="text-xs">Jugador</Label>
                        <Select
                          value={g.jugador_id}
                          onValueChange={(v) => {
                            const meta = jugadoresOpciones.find((j) => j.id === v)
                            setGolesForm((prev) =>
                              prev.map((row) =>
                                row.tempId === g.tempId
                                  ? { ...row, jugador_id: v, equipo_id: meta?.equipoId ?? row.equipo_id }
                                  : row,
                              ),
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {jugadoresOpciones.map((j) => (
                              <SelectItem key={`${g.tempId}-${j.id}`} value={j.id}>
                                {j.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs">Equipo anotador</Label>
                        <Select
                          value={g.equipo_id}
                          onValueChange={(v) =>
                            setGolesForm((prev) =>
                              prev.map((row) => (row.tempId === g.tempId ? { ...row, equipo_id: v } : row)),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={partido.equipoLocalId!}>Local</SelectItem>
                            <SelectItem value={partido.equipoVisitanteId!}>Visitante</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-xs">Minuto</Label>
                        <Input
                          inputMode="numeric"
                          value={g.minuto}
                          onChange={(e) =>
                            setGolesForm((prev) =>
                              prev.map((row) => (row.tempId === g.tempId ? { ...row, minuto: e.target.value } : row)),
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setGolesForm((prev) => prev.filter((row) => row.tempId !== g.tempId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Tarjetas</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addTarjeta}>
                  <Plus className="mr-1 h-4 w-4" />
                  Tarjeta
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {tarjetasForm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin tarjetas.</p>
                ) : (
                  tarjetasForm.map((t) => (
                    <div key={t.tempId} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
                      <div className="min-w-[160px] flex-1 space-y-1">
                        <Label className="text-xs">Jugador</Label>
                        <Select
                          value={t.jugador_id}
                          onValueChange={(v) =>
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, jugador_id: v } : row)),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {jugadoresOpciones.map((j) => (
                              <SelectItem key={`${t.tempId}-${j.id}`} value={j.id}>
                                {j.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={t.tipo}
                          onValueChange={(v) =>
                            setTarjetasForm((prev) =>
                              prev.map((row) =>
                                row.tempId === t.tempId ? { ...row, tipo: v as 'amarilla' | 'roja' } : row,
                              ),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amarilla">Amarilla</SelectItem>
                            <SelectItem value="roja">Roja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setTarjetasForm((prev) => prev.filter((row) => row.tempId !== t.tempId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Árbitro y observaciones</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Árbitro</Label>
                {arbitrosQ.isLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (arbitrosQ.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay árbitros en el catálogo.</p>
                ) : (
                  <Select value={arbitroId || '__none__'} onValueChange={(v) => setArbitroId(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar árbitro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {arbitrosQ.data!.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observaciones</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
