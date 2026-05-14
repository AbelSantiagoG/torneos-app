import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, ArrowLeft, Plus, Trash2, Printer } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import {
  getOrCreateActa,
  guardarActaCompleta,
  listGolesPartido,
  listPartidosParaActa,
  listTarjetasPartido,
  listPartidoJugadores,
  listCambiosPartido,
  estadoActaUi,
} from '@/features/actas/actaPartidoService'
import type { PartidoListaUi } from '@/features/partidos/partidosService'
import { partidosTorneoQueryKey } from '@/features/partidos/usePartidosTorneo'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
import { isJugadoEstado } from '@/features/partidos/partidosUi'
import type { DefinicionPartidoDb, TipoGolDb, TipoTarjetaActaDb } from '@/types/database'

interface ActaPartidoPageProps {
  onBack?: () => void
}

type GolForm = { tempId: string; jugador_id: string; equipo_id: string; minuto: string; tipo_gol: TipoGolDb | string }
type TarjForm = {
  tempId: string
  jugador_id: string
  equipo_id: string
  tipo: TipoTarjetaActaDb | string
  minuto: string
  motivo: string
}
type CambioForm = {
  tempId: string
  equipo_id: string
  sale_id: string
  entra_id: string
  minuto: string
  obs: string
}

const DEF_LABEL: Record<string, string> = {
  tiempo_reglamentario: 'Tiempo reglamentario',
  tiempo_extra: 'Tiempo extra',
  penales: 'Penales',
  walkover: 'Walkover / W',
  suspendido: 'Suspendido',
}

function LogoMark({
  nombre,
  color,
  logoUrl,
  logoPublicId,
  size = 'h-16 w-16',
}: {
  nombre: string
  color: string
  logoUrl?: string | null
  logoPublicId?: string | null
  size?: string
}) {
  const src = resolveDisplayImageUrl(logoPublicId, logoUrl, displayImagePresets.equipoLogoThumb())
  if (src) {
    return <img src={src} alt="" className={`${size} shrink-0 rounded-lg border object-cover`} />
  }
  const ph = (nombre || '?').slice(0, 2).toUpperCase()
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {ph}
    </div>
  )
}

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

  const pjInitQ = useQuery({
    queryKey: ['acta-pj', partidoId],
    enabled: Boolean(partidoId),
    queryFn: () => listPartidoJugadores(partidoId),
  })

  const cambiosInitQ = useQuery({
    queryKey: ['acta-cambios', partidoId],
    enabled: Boolean(partidoId),
    queryFn: () => listCambiosPartido(partidoId),
  })

  const [arbitroNombre, setArbitroNombre] = useState('')
  const [escuelaArbitral, setEscuelaArbitral] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [definicion, setDefinicion] = useState<DefinicionPartidoDb | string>('tiempo_reglamentario')
  const [penL, setPenL] = useState('')
  const [penV, setPenV] = useState('')
  const [ganadorId, setGanadorId] = useState('')
  const [noPresentId, setNoPresentId] = useState('')

  const [titLocal, setTitLocal] = useState<Set<string>>(new Set())
  const [ingLocal, setIngLocal] = useState<Set<string>>(new Set())
  const [titVis, setTitVis] = useState<Set<string>>(new Set())
  const [ingVis, setIngVis] = useState<Set<string>>(new Set())

  const [golesForm, setGolesForm] = useState<GolForm[]>([])
  const [tarjetasForm, setTarjetasForm] = useState<TarjForm[]>([])
  const [cambiosForm, setCambiosForm] = useState<CambioForm[]>([])
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
    setArbitroNombre(actaQ.data.arbitro_nombre ?? '')
    setEscuelaArbitral(actaQ.data.escuela_arbitral_nombre ?? '')
    setObservaciones(actaQ.data.observaciones ?? '')
    setDefinicion(actaQ.data.definicion ?? 'tiempo_reglamentario')
    setPenL(actaQ.data.penales_local != null ? String(actaQ.data.penales_local) : '')
    setPenV(actaQ.data.penales_visitante != null ? String(actaQ.data.penales_visitante) : '')
    setGanadorId(actaQ.data.equipo_ganador_id ?? '')
    setNoPresentId(actaQ.data.equipo_no_presentado_id ?? '')
  }, [partidoId, actaQ.data])

  useEffect(() => {
    if (!golesInitQ.data) return
    setGolesForm(
      golesInitQ.data.map((g) => ({
        tempId: g.id ?? crypto.randomUUID(),
        jugador_id: g.jugador_id,
        equipo_id: g.equipo_id,
        minuto: g.minuto != null ? String(g.minuto) : '',
        tipo_gol: (g.tipo_gol as TipoGolDb) ?? 'normal',
      })),
    )
  }, [golesInitQ.data])

  useEffect(() => {
    if (!tarjetasInitQ.data) return
    setTarjetasForm(
      tarjetasInitQ.data.map((t) => ({
        tempId: t.id ?? crypto.randomUUID(),
        jugador_id: t.jugador_id,
        equipo_id: t.equipo_id,
        tipo: (t.tipo as TipoTarjetaActaDb) ?? 'amarilla',
        minuto: t.minuto != null ? String(t.minuto) : '',
        motivo: t.motivo ?? '',
      })),
    )
  }, [tarjetasInitQ.data])

  useEffect(() => {
    if (!pjInitQ.data) {
      setTitLocal(new Set())
      setIngLocal(new Set())
      setTitVis(new Set())
      setIngVis(new Set())
      return
    }
    const el = partido?.equipoLocalId
    const ev = partido?.equipoVisitanteId
    const tl = new Set<string>()
    const il = new Set<string>()
    const tv = new Set<string>()
    const iv = new Set<string>()
    for (const r of pjInitQ.data) {
      if (r.equipo_id === el && r.rol === 'titular') tl.add(r.jugador_id)
      if (r.equipo_id === el && r.rol === 'ingreso_cambio') il.add(r.jugador_id)
      if (r.equipo_id === ev && r.rol === 'titular') tv.add(r.jugador_id)
      if (r.equipo_id === ev && r.rol === 'ingreso_cambio') iv.add(r.jugador_id)
    }
    setTitLocal(tl)
    setIngLocal(il)
    setTitVis(tv)
    setIngVis(iv)
  }, [pjInitQ.data, partido?.equipoLocalId, partido?.equipoVisitanteId])

  useEffect(() => {
    if (!cambiosInitQ.data) return
    setCambiosForm(
      cambiosInitQ.data.map((c) => ({
        tempId: c.id ?? crypto.randomUUID(),
        equipo_id: c.equipo_id,
        sale_id: c.jugador_sale_id,
        entra_id: c.jugador_entra_id,
        minuto: c.minuto != null ? String(c.minuto) : '',
        obs: c.observacion ?? '',
      })),
    )
  }, [cambiosInitQ.data])

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

  const localRow = equiposQ.data?.local
  const visitRow = equiposQ.data?.visitante
  const categoria = categorias.find((c) => c.id === partido?.categoriaId)

  const localColor = localRow?.color ?? '#64748b'
  const visitColor = visitRow?.color ?? '#64748b'
  const localNombre = localRow?.nombre ?? partido?.equipoLocalNombre ?? 'Local'
  const visitNombre = visitRow?.nombre ?? partido?.equipoVisitanteNombre ?? 'Visitante'

  const el = partido?.equipoLocalId
  const ev = partido?.equipoVisitanteId

  const jugadoresEnCampo = useMemo(() => {
    const set = new Set<string>()
    for (const j of titLocal) set.add(j)
    for (const j of ingLocal) set.add(j)
    for (const j of titVis) set.add(j)
    for (const j of ingVis) set.add(j)
    return set
  }, [titLocal, ingLocal, titVis, ingVis])

  const jugadorEquipo = useMemo(() => {
    const m = new Map<string, string>()
    if (el) for (const j of jugLocalQ.data ?? []) m.set(j.id, el)
    if (ev) for (const j of jugVisQ.data ?? []) m.set(j.id, ev)
    return m
  }, [jugLocalQ.data, jugVisQ.data, el, ev])

  const marcador = useMemo(() => {
    if (!el || !ev) return { local: 0, vis: 0 }
    let local = 0
    let vis = 0
    for (const g of golesForm) {
      if (!g.jugador_id || !g.equipo_id) continue
      const tipo = (g.tipo_gol ?? 'normal').toLowerCase()
      if (tipo === 'autogol') {
        if (g.equipo_id === el) vis++
        else if (g.equipo_id === ev) local++
      } else {
        if (g.equipo_id === el) local++
        else if (g.equipo_id === ev) vis++
      }
    }
    return { local, vis }
  }, [golesForm, el, ev])

  const invalidatePartidos = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: partidosTorneoQueryKey(torneoId) })
  }

  const fueTe = definicion === 'tiempo_extra'
  const fuePen = definicion === 'penales'

  const guardar = async () => {
    if (!partido || !actaQ.data || !el || !ev) return
    if (actaQ.data.cerrada) {
      toast.error('Esta acta está cerrada y no se puede editar.')
      return
    }

    const pj: { partido_id: string; equipo_id: string; jugador_id: string; rol: 'titular' | 'ingreso_cambio' }[] = []
    for (const j of titLocal) pj.push({ partido_id: partido.id, equipo_id: el, jugador_id: j, rol: 'titular' })
    for (const j of ingLocal) pj.push({ partido_id: partido.id, equipo_id: el, jugador_id: j, rol: 'ingreso_cambio' })
    for (const j of titVis) pj.push({ partido_id: partido.id, equipo_id: ev, jugador_id: j, rol: 'titular' })
    for (const j of ingVis) pj.push({ partido_id: partido.id, equipo_id: ev, jugador_id: j, rol: 'ingreso_cambio' })

    for (const g of golesForm) {
      if (!g.jugador_id) continue
      if (!jugadoresEnCampo.has(g.jugador_id)) {
        toast.error('Todos los goles deben asignarse a jugadores que jugaron el partido (titular o ingreso).')
        return
      }
    }
    for (const t of tarjetasForm) {
      if (!t.jugador_id) continue
      if (!jugadoresEnCampo.has(t.jugador_id)) {
        toast.error('Las tarjetas solo pueden asignarse a jugadores que jugaron el partido.')
        return
      }
    }

    setSaving(true)
    try {
      const golesPayload = golesForm
        .filter((g) => g.jugador_id && g.equipo_id)
        .map((g) => ({
          jugador_id: g.jugador_id,
          equipo_id: g.equipo_id,
          minuto: g.minuto.trim() ? Number(g.minuto) : null,
          tipo_gol: (g.tipo_gol ?? 'normal') as string,
        }))

      const tarPayload = tarjetasForm
        .filter((t) => t.jugador_id)
        .map((t) => ({
          jugador_id: t.jugador_id,
          equipo_id: t.equipo_id || jugadorEquipo.get(t.jugador_id) || el,
          tipo: t.tipo,
          minuto: t.minuto.trim() ? Number(t.minuto) : null,
          motivo: t.motivo.trim() || null,
        }))

      const cambiosPayload = cambiosForm
        .filter((c) => c.sale_id && c.entra_id && c.equipo_id)
        .map((c) => ({
          equipo_id: c.equipo_id,
          jugador_sale_id: c.sale_id,
          jugador_entra_id: c.entra_id,
          minuto: c.minuto.trim() ? Number(c.minuto) : null,
          observacion: c.obs.trim() || null,
        }))

      await guardarActaCompleta({
        actaId: actaQ.data.id,
        partidoId: partido.id,
        equipoLocalId: el,
        equipoVisitanteId: ev,
        arbitro_id: actaQ.data.arbitro_id ?? null,
        arbitro_nombre: arbitroNombre.trim() || null,
        escuela_arbitral_nombre: escuelaArbitral.trim() || null,
        observaciones: observaciones.trim() || null,
        definicion,
        fue_tiempo_extra: fueTe,
        fue_penales: fuePen,
        penales_local: penL.trim() ? Number(penL) : null,
        penales_visitante: penV.trim() ? Number(penV) : null,
        equipo_ganador_id: ganadorId || null,
        equipo_no_presentado_id: noPresentId || null,
        partidoJugadores: pj,
        cambios: cambiosPayload,
        goles: golesPayload,
        tarjetas: tarPayload,
        tieneProgramacion: Boolean(partido.programacionId),
      })
      toast.success('Acta guardada correctamente.')
      void actaQ.refetch()
      void golesInitQ.refetch()
      void tarjetasInitQ.refetch()
      void pjInitQ.refetch()
      void cambiosInitQ.refetch()
      void partidosQ.refetch()
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'programacion'))
    } finally {
      setSaving(false)
    }
  }

  const addGol = () => {
    if (!el) return
    setGolesForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), jugador_id: '', equipo_id: el, minuto: '', tipo_gol: 'normal' },
    ])
  }

  const addTarjeta = () => {
    if (!el) return
    setTarjetasForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), jugador_id: '', equipo_id: el, tipo: 'amarilla', minuto: '', motivo: '' },
    ])
  }

  const addCambio = (equipoId: string) => {
    setCambiosForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), equipo_id: equipoId, sale_id: '', entra_id: '', minuto: '', obs: '' },
    ])
  }

  const jugadoresOpcionesGol = useMemo(() => {
    const out: { id: string; label: string; equipoId: string }[] = []
    for (const j of jugLocalQ.data ?? []) {
      if (jugadoresEnCampo.has(j.id)) out.push({ id: j.id, label: `${j.nombre} (local)`, equipoId: el! })
    }
    for (const j of jugVisQ.data ?? []) {
      if (jugadoresEnCampo.has(j.id)) out.push({ id: j.id, label: `${j.nombre} (visitante)`, equipoId: ev! })
    }
    return out
  }, [jugLocalQ.data, jugVisQ.data, el, ev, jugadoresEnCampo])

  const imprimir = () => window.print()

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
    <div className="space-y-6 print:space-y-3">
      <PageHeader
        className="no-print"
        title="Actas por categoría"
        description="Partidos programados o jugados. Completa titulares antes de goles y tarjetas."
        actions={
          <div className="flex gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            )}
            <Button type="button" variant="outline" onClick={imprimir} disabled={!partido}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir / PDF
            </Button>
            <Button type="button" onClick={() => void guardar()} disabled={saving || !partido || Boolean(actaQ.data?.cerrada)}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar acta'}
            </Button>
          </div>
        }
      />

      <Card className="no-print">
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
                <p className="text-sm text-muted-foreground">No hay partidos programados o jugados en esta categoría.</p>
              ) : (
                <Select value={partidoId} onValueChange={setPartidoId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {partidosLista.map((p: PartidoListaUi) => (
                      <SelectItem key={p.id} value={p.id}>
                        J{p.jornada}: {p.equipoLocalNombre} vs {p.equipoVisitanteNombre}
                        {p.fecha ? ` — ${formatDate(p.fecha)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {partidosLista.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {partidosLista.map((p) => {
                const st = estadoActaUi(p)
                const badge =
                  st === 'cerrada' ? (
                    <Badge>Cerrada</Badge>
                  ) : st === 'edicion' ? (
                    <Badge variant="secondary">En edición</Badge>
                  ) : (
                    <Badge variant="outline">Sin acta</Badge>
                  )
                return (
                  <Card key={p.id} className="border-muted">
                    <CardContent className="space-y-2 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">
                          J{p.jornada}: {p.equipoLocalNombre} vs {p.equipoVisitanteNombre}
                        </span>
                        {badge}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.fecha ? formatDate(p.fecha) : '—'} · {p.hora || '—'} · {p.cancha || '—'}
                      </p>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setPartidoId(p.id)}>
                        Ver / editar acta
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {partido && (
        <>
          <div className="hidden print:block">
            <h1 className="text-xl font-bold">{torneo?.nombre}</h1>
            <p className="text-sm">
              {categoria?.nombre} — Jornada {partido.jornada} — {partido.fecha ? formatDate(partido.fecha) : '—'} {partido.hora} {partido.cancha}
            </p>
            <p className="mt-4 text-2xl font-bold">
              {localNombre} {marcador.local} - {marcador.vis} {visitNombre}
            </p>
            {definicion === 'penales' && penL && penV && (
              <p className="text-sm">
                Penales ({penL}) - ({penV})
              </p>
            )}
            <p className="mt-2 text-sm">
              Árbitro: {arbitroNombre || '—'} — {escuelaArbitral || '—'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Información del partido</CardTitle>
                  <CardDescription>
                    {partido.fecha ? formatDate(partido.fecha) : '—'} — {partido.hora || '—'} — {partido.cancha || '—'}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" style={{ borderColor: categoria?.color, color: categoria?.color }}>
                    {categoria?.nombre ?? partido.categoriaNombre}
                  </Badge>
                  <Badge variant={isJugadoEstado(partido.estado) ? 'default' : 'secondary'}>
                    {isJugadoEstado(partido.estado) ? 'Jugado' : 'Programado / pendiente'}
                  </Badge>
                  {actaQ.data?.cerrada && <Badge variant="destructive">Acta cerrada</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {equiposQ.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-8 py-6">
                  <div className="text-center">
                    <LogoMark
                      nombre={localNombre}
                      color={localColor}
                      logoUrl={localRow?.logo_url}
                      logoPublicId={localRow?.logo_public_id}
                    />
                    <p className="mt-2 font-semibold">{localNombre}</p>
                    <p className="text-xs text-muted-foreground">Local</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-4">
                      <p className="text-5xl font-bold">{marcador.local}</p>
                      <span className="text-2xl text-muted-foreground">-</span>
                      <p className="text-5xl font-bold">{marcador.vis}</p>
                    </div>
                    {definicion === 'penales' && penL && penV && (
                      <p className="text-sm text-muted-foreground">
                        ({penL}) - ({penV}) penales
                      </p>
                    )}
                    {definicion === 'walkover' && ganadorId && (
                      <p className="text-sm text-muted-foreground">
                        {ganadorId === el ? localNombre : visitNombre} gana por W
                        {noPresentId ? ` — ${noPresentId === el ? localNombre : visitNombre} no se presentó` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <LogoMark
                      nombre={visitNombre}
                      color={visitColor}
                      logoUrl={visitRow?.logo_url}
                      logoPublicId={visitRow?.logo_public_id}
                    />
                    <p className="mt-2 font-semibold">{visitNombre}</p>
                    <p className="text-xs text-muted-foreground">Visitante</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Definición del partido</CardTitle>
              <CardDescription>Tiempo extra, penales o walkover según corresponda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={definicion} onValueChange={(v) => setDefinicion(v)} className="grid gap-2 md:grid-cols-2">
                {(['tiempo_reglamentario', 'tiempo_extra', 'penales', 'walkover', 'suspendido'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <RadioGroupItem value={v} id={`def-${v}`} />
                    <span>{DEF_LABEL[v] ?? v}</span>
                  </label>
                ))}
              </RadioGroup>
              {definicion === 'penales' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Penales local</Label>
                    <Input inputMode="numeric" value={penL} onChange={(e) => setPenL(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Penales visitante</Label>
                    <Input inputMode="numeric" value={penV} onChange={(e) => setPenV(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Equipo ganador</Label>
                    <Select value={ganadorId} onValueChange={setGanadorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={el!}>{localNombre}</SelectItem>
                        <SelectItem value={ev!}>{visitNombre}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {definicion === 'walkover' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Equipo ganador</Label>
                    <Select value={ganadorId} onValueChange={setGanadorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={el!}>{localNombre}</SelectItem>
                        <SelectItem value={ev!}>{visitNombre}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Equipo que no se presentó</Label>
                    <Select value={noPresentId} onValueChange={setNoPresentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={el!}>{localNombre}</SelectItem>
                        <SelectItem value={ev!}>{visitNombre}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{localNombre} — jugadores</CardTitle>
                <CardDescription>Marca titulares e ingresos por cambio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(jugLocalQ.data ?? []).map((j) => (
                  <div key={j.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{j.nombre}</span>
                    <label className="flex items-center gap-1">
                      <Checkbox
                        checked={titLocal.has(j.id)}
                        onCheckedChange={(v) => {
                          const on = v === true
                          if (on) {
                            setTitLocal((s) => new Set(s).add(j.id))
                            setIngLocal((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          } else {
                            setTitLocal((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          }
                        }}
                      />
                      Titular
                    </label>
                    <label className="flex items-center gap-1">
                      <Checkbox
                        checked={ingLocal.has(j.id)}
                        onCheckedChange={(v) => {
                          const on = v === true
                          if (on) {
                            setIngLocal((s) => new Set(s).add(j.id))
                            setTitLocal((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          } else {
                            setIngLocal((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          }
                        }}
                      />
                      Ingreso
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{visitNombre} — jugadores</CardTitle>
                <CardDescription>Marca titulares e ingresos por cambio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(jugVisQ.data ?? []).map((j) => (
                  <div key={j.id} className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{j.nombre}</span>
                    <label className="flex items-center gap-1">
                      <Checkbox
                        checked={titVis.has(j.id)}
                        onCheckedChange={(v) => {
                          const on = v === true
                          if (on) {
                            setTitVis((s) => new Set(s).add(j.id))
                            setIngVis((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          } else {
                            setTitVis((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          }
                        }}
                      />
                      Titular
                    </label>
                    <label className="flex items-center gap-1">
                      <Checkbox
                        checked={ingVis.has(j.id)}
                        onCheckedChange={(v) => {
                          const on = v === true
                          if (on) {
                            setIngVis((s) => new Set(s).add(j.id))
                            setTitVis((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          } else {
                            setIngVis((s) => {
                              const n = new Set(s)
                              n.delete(j.id)
                              return n
                            })
                          }
                        }}
                      />
                      Ingreso
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Cambios / sustituciones (opcional)</CardTitle>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => addCambio(el!)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Local
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addCambio(ev!)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Visitante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {cambiosForm.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
              ) : (
                cambiosForm.map((c) => (
                  <div key={c.tempId} className="grid gap-2 rounded-md border p-3 md:grid-cols-5">
                    <Select value={c.equipo_id} onValueChange={(v) => setCambiosForm((p) => p.map((x) => (x.tempId === c.tempId ? { ...x, equipo_id: v } : x)))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={el!}>Local</SelectItem>
                        <SelectItem value={ev!}>Visitante</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={c.sale_id}
                      onValueChange={(v) => setCambiosForm((p) => p.map((x) => (x.tempId === c.tempId ? { ...x, sale_id: v } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sale" />
                      </SelectTrigger>
                      <SelectContent>
                        {(c.equipo_id === el ? jugLocalQ.data : jugVisQ.data)?.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={c.entra_id}
                      onValueChange={(v) => setCambiosForm((p) => p.map((x) => (x.tempId === c.tempId ? { ...x, entra_id: v } : x)))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Entra" />
                      </SelectTrigger>
                      <SelectContent>
                        {(c.equipo_id === el ? jugLocalQ.data : jugVisQ.data)?.map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Min"
                      inputMode="numeric"
                      value={c.minuto}
                      onChange={(e) => setCambiosForm((p) => p.map((x) => (x.tempId === c.tempId ? { ...x, minuto: e.target.value } : x)))}
                    />
                    <div className="flex gap-1 md:col-span-5">
                      <Input
                        placeholder="Observación"
                        className="flex-1"
                        value={c.obs}
                        onChange={(e) => setCambiosForm((p) => p.map((x) => (x.tempId === c.tempId ? { ...x, obs: e.target.value } : x)))}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setCambiosForm((p) => p.filter((x) => x.tempId !== c.tempId))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
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
                            const meta = jugadoresOpcionesGol.find((j) => j.id === v)
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
                            {jugadoresOpcionesGol.map((j) => (
                              <SelectItem key={`${g.tempId}-${j.id}`} value={j.id}>
                                {j.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-36 space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={g.tipo_gol as string}
                          onValueChange={(v) =>
                            setGolesForm((prev) => prev.map((row) => (row.tempId === g.tempId ? { ...row, tipo_gol: v } : row)))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="penal">Penal</SelectItem>
                            <SelectItem value="tiro_libre">Tiro libre</SelectItem>
                            <SelectItem value="autogol">Autogol</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-28 space-y-1">
                        <Label className="text-xs">Equipo anotador</Label>
                        <Select
                          value={g.equipo_id}
                          onValueChange={(v) =>
                            setGolesForm((prev) => prev.map((row) => (row.tempId === g.tempId ? { ...row, equipo_id: v } : row)))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={el!}>Local</SelectItem>
                            <SelectItem value={ev!}>Visitante</SelectItem>
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
                      {g.tipo_gol === 'autogol' && (
                        <p className="w-full text-xs text-amber-700">
                          Autogol: elige el jugador del equipo que cometió el autogol; el gol sumará al rival en el marcador.
                        </p>
                      )}
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
                      <div className="min-w-[140px] flex-1 space-y-1">
                        <Label className="text-xs">Jugador</Label>
                        <Select
                          value={t.jugador_id}
                          onValueChange={(v) => {
                            const eq = jugadorEquipo.get(v) ?? t.equipo_id
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, jugador_id: v, equipo_id: eq } : row)),
                            )
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {jugadoresOpcionesGol.map((j) => (
                              <SelectItem key={`${t.tempId}-${j.id}`} value={j.id}>
                                {j.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-40 space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={t.tipo as string}
                          onValueChange={(v) =>
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, tipo: v as TarjForm['tipo'] } : row)),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amarilla">Amarilla</SelectItem>
                            <SelectItem value="roja">Roja</SelectItem>
                            <SelectItem value="doble_amarilla">Doble amarilla</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-xs">Minuto</Label>
                        <Input
                          inputMode="numeric"
                          value={t.minuto}
                          onChange={(e) =>
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, minuto: e.target.value } : row)),
                            )
                          }
                        />
                      </div>
                      <div className="min-w-[120px] flex-1 space-y-1">
                        <Label className="text-xs">Motivo (opcional)</Label>
                        <Input
                          value={t.motivo}
                          onChange={(e) =>
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, motivo: e.target.value } : row)),
                            )
                          }
                        />
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
              <CardDescription>Nombre y escuela arbitral (texto libre).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del árbitro</Label>
                <Input value={arbitroNombre} onChange={(e) => setArbitroNombre(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className="space-y-2">
                <Label>Escuela arbitral</Label>
                <Input value={escuelaArbitral} onChange={(e) => setEscuelaArbitral(e.target.value)} placeholder="Opcional" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Observaciones del acta</Label>
                <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  )
}
