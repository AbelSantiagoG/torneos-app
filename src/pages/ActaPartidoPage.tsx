import { useEffect, useMemo, useRef, useState } from 'react'
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
  getActaByPartido,
  getOrCreateActa,
  guardarActaAdministrativa,
  guardarActaCompleta,
  listGolesPartido,
  listPartidosParaActa,
  listTarjetasPartido,
  listPartidoJugadores,
  listCambiosPartido,
  estadoActaUi,
  eliminarActaPartidoSeguro,
} from '@/features/actas/actaPartidoService'
import type { PartidoListaUi } from '@/features/partidos/partidosService'
import { partidosTorneoQueryKey } from '@/features/partidos/usePartidosTorneo'
import { invalidateEstadisticasQueries } from '@/features/estadisticas/estadisticasCache'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
import { isJugadoEstado } from '@/features/partidos/partidosUi'
import type { DefinicionPartidoDb, TipoGolDb, TipoTarjetaActaDb } from '@/types/database'
import { ActaPrintDocument } from '@/components/actas/ActaPrintDocument'
import { exportActaPdf } from '@/features/actas/exportActaPdf'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ActaPartidoPageProps {
  onBack?: () => void
  initialPartidoId?: string
  initialCategoriaId?: string
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
  walkover: 'W / No presentación',
  suspendido: 'Suspendido',
}

const DEFINICIONES = [
  { value: 'tiempo_reglamentario', label: 'Tiempo reglamentario' },
  { value: 'tiempo_extra', label: 'Tiempo extra' },
  { value: 'penales', label: 'Penales' },
  { value: 'walkover', label: 'W / No presentación' },
  { value: 'suspendido', label: 'Suspendido' },
] as const

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
    return (
      <img src={src} alt="" className={`mx-auto ${size} shrink-0 rounded-lg border object-cover`} />
    )
  }
  const ph = (nombre || '?').slice(0, 2).toUpperCase()
  return (
    <div
      className={`mx-auto flex ${size} shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white`}
      style={{ backgroundColor: color }}
    >
      {ph}
    </div>
  )
}

export function ActaPartidoPage({ onBack, initialPartidoId, initialCategoriaId }: ActaPartidoPageProps) {
  const qc = useQueryClient()
  const printRef = useRef<HTMLDivElement>(null)
  const [categoriaId, setCategoriaId] = useState(initialCategoriaId ?? '')
  const [partidoId, setPartidoId] = useState(initialPartidoId ?? '')

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
    queryFn: () => getActaByPartido(partidoId),
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
  const [deletingActa, setDeletingActa] = useState(false)

  useEffect(() => {
    if (initialCategoriaId) setCategoriaId(initialCategoriaId)
  }, [initialCategoriaId])

  useEffect(() => {
    if (initialPartidoId) setPartidoId(initialPartidoId)
  }, [initialPartidoId])

  useEffect(() => {
    if (categorias.length && !categoriaId) {
      setCategoriaId(categorias[0]!.id)
    }
  }, [categorias, categoriaId])

  const isWalkover = definicion === 'walkover'
  const isSuspendido = definicion === 'suspendido'
  const bloqueaEventosDeportivos = isWalkover || isSuspendido

  const limpiarEventosDeportivos = () => {
      setGolesForm([])
      setTarjetasForm([])
    setCambiosForm([])
    setTitLocal(new Set())
    setIngLocal(new Set())
    setTitVis(new Set())
    setIngVis(new Set())
  }

  useEffect(() => {
    if (isWalkover) {
      limpiarEventosDeportivos()
      setPenL('')
      setPenV('')
    }
  }, [isWalkover])

  useEffect(() => {
    if (isSuspendido) {
      limpiarEventosDeportivos()
      setPenL('')
      setPenV('')
      setGanadorId('')
      setNoPresentId('')
    }
  }, [isSuspendido])

  useEffect(() => {
    if (isWalkover && ganadorId && noPresentId && ganadorId === noPresentId) {
      setGanadorId('')
    }
  }, [ganadorId, isWalkover, noPresentId])

  useEffect(() => {
    if (partidoId && partidosLista.length && !partidosLista.some((p) => p.id === partidoId)) {
      setPartidoId('')
    }
  }, [partidosLista, partidoId])

  useEffect(() => {
    if (!partidoId) return
    if (!actaQ.data) {
      setArbitroNombre('')
      setEscuelaArbitral('')
      setObservaciones('')
      setDefinicion('tiempo_reglamentario')
      setPenL('')
      setPenV('')
      setGanadorId('')
      setNoPresentId('')
      return
    }
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
    if (bloqueaEventosDeportivos) {
      setGolesForm([])
      return
    }
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
  }, [bloqueaEventosDeportivos, golesInitQ.data])

  useEffect(() => {
    if (bloqueaEventosDeportivos) {
      setTarjetasForm([])
      return
    }
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
  }, [bloqueaEventosDeportivos, tarjetasInitQ.data])

  useEffect(() => {
    if (bloqueaEventosDeportivos) {
      setTitLocal(new Set())
      setIngLocal(new Set())
      setTitVis(new Set())
      setIngVis(new Set())
      return
    }
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
  }, [bloqueaEventosDeportivos, pjInitQ.data, partido?.equipoLocalId, partido?.equipoVisitanteId])

  useEffect(() => {
    if (bloqueaEventosDeportivos) {
      setCambiosForm([])
      return
    }
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
  }, [bloqueaEventosDeportivos, cambiosInitQ.data])

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

  const participantesPorEquipo = useMemo(() => {
    return {
      local: new Set([...titLocal, ...ingLocal]),
      visitante: new Set([...titVis, ...ingVis]),
    }
  }, [titLocal, ingLocal, titVis, ingVis])

  const jugadoresOpcionesPorEquipo = useMemo(() => {
    const localPermitidos = participantesPorEquipo.local.size ? participantesPorEquipo.local : null
    const visitantePermitidos = participantesPorEquipo.visitante.size ? participantesPorEquipo.visitante : null
    return {
      local: (jugLocalQ.data ?? [])
        .filter((j) => !localPermitidos || localPermitidos.has(j.id))
        .map((j) => ({ id: j.id, label: j.nombre, equipoId: el ?? '' })),
      visitante: (jugVisQ.data ?? [])
        .filter((j) => !visitantePermitidos || visitantePermitidos.has(j.id))
        .map((j) => ({ id: j.id, label: j.nombre, equipoId: ev ?? '' })),
    }
  }, [
    el,
    ev,
    jugLocalQ.data,
    jugVisQ.data,
    participantesPorEquipo.local,
    participantesPorEquipo.visitante,
  ])

  const jugadoresOpcionesPorEquipoId = useMemo(() => {
    return new Map([
      [el ?? '', jugadoresOpcionesPorEquipo.local],
      [ev ?? '', jugadoresOpcionesPorEquipo.visitante],
    ])
  }, [el, ev, jugadoresOpcionesPorEquipo.local, jugadoresOpcionesPorEquipo.visitante])

  const marcador = useMemo(() => {
    if (!el || !ev) return { local: 0, vis: 0 }
    if (isWalkover && ganadorId) {
      return ganadorId === el ? { local: 3, vis: 0 } : { local: 0, vis: 3 }
    }
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
  }, [golesForm, el, ev, ganadorId, isWalkover])

  const invalidatePartidos = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: partidosTorneoQueryKey(torneoId) })
  }

  const refrescarTrasGuardarActa = async () => {
    void actaQ.refetch()
    void golesInitQ.refetch()
    void tarjetasInitQ.refetch()
    void pjInitQ.refetch()
    void cambiosInitQ.refetch()
    void partidosQ.refetch()
    void qc.invalidateQueries({ queryKey: ['actas-listado'] })
    invalidatePartidos()
    if (torneoId) {
      invalidateEstadisticasQueries(qc, {
        torneoId,
        categoriaId: partido?.categoriaId ?? categoriaId,
        faseId: partido?.faseTorneoId ?? undefined,
      })
      await qc.refetchQueries({
        queryKey: ['estadisticas', torneoId],
        type: 'active',
      })
    }
  }

  const fueTe = definicion === 'tiempo_extra'
  const fuePen = definicion === 'penales'

  const cambiarDefinicion = (value: string) => {
    const pasaAAdministrativo = value === 'walkover' || value === 'suspendido'
    const hayEventos =
      golesForm.length > 0 ||
      tarjetasForm.length > 0 ||
      cambiosForm.length > 0 ||
      titLocal.size > 0 ||
      ingLocal.size > 0 ||
      titVis.size > 0 ||
      ingVis.size > 0
    if (pasaAAdministrativo && hayEventos) {
      const ok = confirm(
        value === 'walkover'
          ? 'Al marcar el partido como W se limpiarÃ¡n los eventos deportivos registrados.'
          : 'Al marcar el partido como suspendido se limpiarÃ¡n los eventos deportivos registrados.',
      )
      if (!ok) return
      limpiarEventosDeportivos()
    }
    setDefinicion(value)
    if (value !== 'penales') {
      setPenL('')
      setPenV('')
    }
    if (value !== 'walkover' && value !== 'penales') {
      setGanadorId('')
    }
    if (value !== 'walkover') {
      setNoPresentId('')
    }
  }

  const guardar = async () => {
    if (!partido) {
      toast.error('Selecciona un partido antes de guardar el acta.')
      console.error('Error guardando acta', { reason: 'partido no cargado', partidoId })
      return
    }
    if (!el || !ev) {
      toast.error('No se pudo guardar el acta porque faltan los equipos del partido.')
      console.error('Error guardando acta', { reason: 'equipos del partido incompletos', partido })
      return
    }
    if (actaQ.data?.cerrada) {
      toast.error('Esta acta está cerrada y no se puede editar.')
      return
    }

    const pj: { partido_id: string; equipo_id: string; jugador_id: string; rol: 'titular' | 'ingreso_cambio' }[] = []
    for (const j of titLocal) pj.push({ partido_id: partido.id, equipo_id: el, jugador_id: j, rol: 'titular' })
    for (const j of ingLocal) pj.push({ partido_id: partido.id, equipo_id: el, jugador_id: j, rol: 'ingreso_cambio' })
    for (const j of titVis) pj.push({ partido_id: partido.id, equipo_id: ev, jugador_id: j, rol: 'titular' })
    for (const j of ingVis) pj.push({ partido_id: partido.id, equipo_id: ev, jugador_id: j, rol: 'ingreso_cambio' })

    if (isSuspendido && !observaciones.trim()) {
      toast.error('Indica observaciones sobre la suspensión del partido.')
      return
    }

    if (isWalkover) {
      if (!noPresentId || !ganadorId) {
        toast.error('Selecciona el equipo ganador y el equipo que no se presentó.')
        return
      }
      if (noPresentId === ganadorId) {
        toast.error('El equipo ganador no puede ser el mismo que el equipo que no se presentó.')
        return
      }
      if (![el, ev].includes(noPresentId) || ![el, ev].includes(ganadorId)) {
        toast.error('El equipo ganador y el equipo que no se presentó deben pertenecer al partido.')
        return
      }
    }

    if (fuePen && !isWalkover && !isSuspendido) {
      if (!penL.trim() || !penV.trim() || !ganadorId) {
        toast.error('Para definir por penales, completa penales local, penales visitante y equipo ganador.')
        return
      }
      if (![el, ev].includes(ganadorId)) {
        toast.error('El equipo ganador debe pertenecer al partido.')
        return
      }
    }

    if (isWalkover) {
      const payload = {
        actaId: actaQ.data?.id ?? null,
        partidoId: partido.id,
        definicion: 'walkover',
        equipo_ganador_id: ganadorId,
        equipo_no_presentado_id: noPresentId,
        arbitro_nombre: arbitroNombre.trim() || null,
        escuela_arbitral_nombre: escuelaArbitral.trim() || null,
        observaciones: observaciones.trim() || null,
      }
      setSaving(true)
      try {
        await guardarActaAdministrativa({
          ...payload,
          tieneProgramacion: Boolean(partido.programacionId),
        })
        toast.success('Acta guardada correctamente.')
        try {
          await refrescarTrasGuardarActa()
        } catch (refErr) {
          console.error('Error en estadísticas', { context: 'refresco tras acta W', error: refErr })
          toast.warning('El acta fue guardada, pero no se pudieron refrescar las estadísticas.')
        }
      } catch (e) {
        console.error('Error guardando acta', { payload, error: e })
        const msg = translateUserError(e, 'programacion')
        toast.error(
          msg.includes('Falta completar') || msg.includes('No se pudo guardar la informaci')
            ? 'No se pudo guardar el acta por W. Revisa ganador y equipo no presentado; el detalle tÃ©cnico quedÃ³ en consola.'
            : msg,
        )
      } finally {
        setSaving(false)
      }
      return
    }

    if (!bloqueaEventosDeportivos) {
      for (const g of golesForm) {
        if (!g.jugador_id) continue
        const equipoJugador = jugadorEquipo.get(g.jugador_id)
        if (!g.equipo_id || equipoJugador !== g.equipo_id) {
          toast.error('El jugador del gol debe pertenecer al equipo seleccionado.')
          return
        }
        const participantesEquipo =
          g.equipo_id === el ? participantesPorEquipo.local : g.equipo_id === ev ? participantesPorEquipo.visitante : null
        if (participantesEquipo?.size && !participantesEquipo.has(g.jugador_id)) {
          toast.error('Todos los goles deben asignarse a jugadores participantes del partido.')
          return
        }
      }
      for (const t of tarjetasForm) {
        if (!t.jugador_id) continue
        const equipoJugador = jugadorEquipo.get(t.jugador_id)
        if (!t.equipo_id || equipoJugador !== t.equipo_id) {
          toast.error('El jugador de la tarjeta debe pertenecer al equipo seleccionado.')
          return
        }
        const participantesEquipo =
          t.equipo_id === el ? participantesPorEquipo.local : t.equipo_id === ev ? participantesPorEquipo.visitante : null
        if (participantesEquipo?.size && !participantesEquipo.has(t.jugador_id)) {
          toast.error('Las tarjetas solo pueden asignarse a jugadores participantes del partido.')
          return
        }
      }
    }

    let payloadForLog: unknown = null
    setSaving(true)
    try {
      const actaActual = actaQ.data ?? await getOrCreateActa(partido.id)
      const golesPayload = bloqueaEventosDeportivos
        ? []
        : golesForm
        .filter((g) => g.jugador_id && g.equipo_id)
        .map((g) => ({
          jugador_id: g.jugador_id,
          equipo_id: g.equipo_id,
          minuto: g.minuto.trim() ? Number(g.minuto) : null,
          tipo_gol: (g.tipo_gol ?? 'normal') as string,
        }))

      const tarPayload = bloqueaEventosDeportivos
        ? []
        : tarjetasForm
        .filter((t) => t.jugador_id)
        .map((t) => ({
          jugador_id: t.jugador_id,
          equipo_id: t.equipo_id || jugadorEquipo.get(t.jugador_id) || el,
          tipo: t.tipo,
          minuto: t.minuto.trim() ? Number(t.minuto) : null,
          motivo: t.motivo.trim() || null,
        }))

      const cambiosPayload = bloqueaEventosDeportivos
        ? []
        : cambiosForm
        .filter((c) => c.sale_id && c.entra_id && c.equipo_id)
        .map((c) => ({
          equipo_id: c.equipo_id,
          jugador_sale_id: c.sale_id,
          jugador_entra_id: c.entra_id,
          minuto: c.minuto.trim() ? Number(c.minuto) : null,
          observacion: c.obs.trim() || null,
        }))

      const payload = {
        actaId: actaActual.id,
        partidoId: partido.id,
        equipoLocalId: el,
        equipoVisitanteId: ev,
        arbitro_nombre: arbitroNombre.trim() || null,
        escuela_arbitral_nombre: escuelaArbitral.trim() || null,
        observaciones: observaciones.trim() || null,
        definicion,
        fue_tiempo_extra: bloqueaEventosDeportivos ? false : fueTe,
        fue_penales: bloqueaEventosDeportivos ? false : fuePen,
        penales_local: bloqueaEventosDeportivos ? null : penL.trim() ? Number(penL) : null,
        penales_visitante: bloqueaEventosDeportivos ? null : penV.trim() ? Number(penV) : null,
        equipo_ganador_id: isSuspendido ? null : ganadorId || null,
        equipo_no_presentado_id: isWalkover ? noPresentId || null : null,
        partidoJugadores: bloqueaEventosDeportivos ? [] : pj,
        cambios: cambiosPayload,
        goles: golesPayload,
        tarjetas: tarPayload,
        tieneProgramacion: Boolean(partido.programacionId),
      }
      payloadForLog = payload
      await guardarActaCompleta(payload)
      toast.success('Acta guardada correctamente.')
      try {
        await refrescarTrasGuardarActa()
      } catch (refErr) {
        console.error('Error en estadísticas', { context: 'refresco tras acta', error: refErr })
        toast.warning('El acta fue guardada, pero no se pudieron refrescar las estadísticas.')
      }
    } catch (e) {
      console.error('Error guardando acta', { payload: payloadForLog, error: e })
      const msg = translateUserError(e, 'programacion')
      toast.error(msg.includes('Falta completar') ? 'No se pudo guardar el acta. Revisa la definiciÃ³n y los campos de resultado.' : msg)
    } finally {
      setSaving(false)
    }
  }

  const addGol = () => {
    if (bloqueaEventosDeportivos) {
      toast.error(isWalkover ? 'No se pueden agregar goles en un partido definido por W.' : 'El partido fue suspendido. No se pueden registrar eventos deportivos.')
      return
    }
    if (!el) return
    setGolesForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), jugador_id: '', equipo_id: el, minuto: '', tipo_gol: 'normal' },
    ])
  }

  const addTarjeta = () => {
    if (bloqueaEventosDeportivos) {
      toast.error(isWalkover ? 'No se pueden agregar tarjetas en un partido definido por W.' : 'El partido fue suspendido. No se pueden registrar eventos deportivos.')
      return
    }
    if (!el) return
    setTarjetasForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), jugador_id: '', equipo_id: el, tipo: 'amarilla', minuto: '', motivo: '' },
    ])
  }

  const addCambio = (equipoId: string) => {
    if (bloqueaEventosDeportivos) {
      toast.error(isWalkover ? 'No se pueden registrar sustituciones en un partido definido por W.' : 'El partido fue suspendido. No se pueden registrar eventos deportivos.')
      return
    }
    setCambiosForm((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), equipo_id: equipoId, sale_id: '', entra_id: '', minuto: '', obs: '' },
    ])
  }

  const jugadoresOpcionesGol = useMemo(() => {
    const out: { id: string; label: string; equipoId: string }[] = []
    for (const j of jugadoresOpcionesPorEquipo.local) out.push({ ...j, label: `${j.label} (local)` })
    for (const j of jugadoresOpcionesPorEquipo.visitante) out.push({ ...j, label: `${j.label} (visitante)` })
    return out
  }, [jugadoresOpcionesPorEquipo.local, jugadoresOpcionesPorEquipo.visitante])

  const exportarPdf = async () => {
    if (!printRef.current || !partido) return
    try {
      await exportActaPdf(
        printRef.current,
        `acta-${localNombre}-vs-${visitNombre}.pdf`.replace(/\s+/g, '-').toLowerCase(),
      )
      toast.success('PDF generado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el PDF')
    }
  }

  const eliminarActa = async (targetPartidoId = partidoId) => {
    if (!targetPartidoId) return
    const ok = confirm(
      'Esto eliminará el acta, goles, tarjetas, jugadores registrados y sustituciones de este partido. El partido seguirá existiendo en el fixture. ¿Deseas continuar?',
    )
    if (!ok) return
    setDeletingActa(true)
    try {
      await eliminarActaPartidoSeguro(targetPartidoId)
      qc.setQueryData(['acta', targetPartidoId], null)
      toast.success('Acta eliminada correctamente.')
      if (targetPartidoId === partidoId) {
        limpiarEventosDeportivos()
        setDefinicion('tiempo_reglamentario')
        setGanadorId('')
        setNoPresentId('')
        setPenL('')
        setPenV('')
      }
      await refrescarTrasGuardarActa()
    } catch (e) {
      console.error('Error eliminando acta', { partidoId: targetPartidoId, error: e })
      toast.error(translateUserError(e, 'programacion') || 'No se pudo eliminar el acta.')
    } finally {
      setDeletingActa(false)
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
        <PageHeader title="Acta de Partido" description="Registro de partido" />
        <EmptyState icon={Save} title="Sin torneo activo" description="Activa un torneo para usar el acta." />
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-3">
      <PageHeader
        className="no-print"
        title={partidoId ? 'Acta de partido' : 'Actas por categoría'}
        description={partidoId ? 'Editar acta y eventos del partido seleccionado.' : 'Partidos programados o jugados. Completa titulares antes de goles y tarjetas.'}
        actions={
          <div className="flex flex-wrap gap-2">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Button>
            )}
            {partidoId && !onBack && (
              <Button variant="outline" onClick={() => setPartidoId('')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cambiar partido
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => void exportarPdf()} disabled={!partido}>
              <Printer className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            {actaQ.data && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive"
                onClick={() => void eliminarActa()}
                disabled={deletingActa || saving || !partido}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingActa ? 'Eliminando...' : 'Eliminar acta'}
              </Button>
            )}
            <Button type="button" onClick={() => void guardar()} disabled={saving || !partido || Boolean(actaQ.data?.cerrada)}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Guardando…' : 'Guardar acta'}
            </Button>
          </div>
        }
      />

      {!partidoId && (
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
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Button size="sm" variant="outline" className="w-full" onClick={() => setPartidoId(p.id)}>
                          {st === 'sin_acta' ? 'Crear acta' : 'Ver / editar acta'}
                        </Button>
                        {st !== 'sin_acta' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-destructive"
                            disabled={deletingActa}
                            onClick={() => void eliminarActa(p.id)}
                          >
                            Eliminar acta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}

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
                <div className="grid grid-cols-1 items-center gap-6 py-6 md:grid-cols-[1fr_auto_1fr]">
                  <div className="flex flex-col items-center text-center">
                    <LogoMark
                      nombre={localNombre}
                      color={localColor}
                      logoUrl={localRow?.logo_url}
                      logoPublicId={localRow?.logo_public_id}
                    />
                    <p className="mt-2 font-semibold">{localNombre}</p>
                    <p className="text-xs text-muted-foreground">Local</p>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-4">
                      <p className="text-5xl font-bold tabular-nums">{marcador.local}</p>
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
                        Ganador por W: {ganadorId === el ? localNombre : visitNombre}
                        <br />
                        Resultado administrativo: 3 - 0
                        {noPresentId ? ` — ${noPresentId === el ? localNombre : visitNombre} no se presentó` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-center text-center">
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
              <div className="space-y-1">
                <Label>Definición</Label>
                <Select value={definicion} onValueChange={cambiarDefinicion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la definición" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEFINICIONES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isWalkover && (
                <Alert>
                  <AlertDescription>
                    Ganador por W. Resultado administrativo: 3 - 0. No se registrarán goles, tarjetas, sustituciones ni jugadores participantes.
                  </AlertDescription>
                </Alert>
              )}
              {isSuspendido && (
                <Alert variant="destructive">
                  <AlertDescription>
                    El partido fue suspendido. No se pueden registrar eventos deportivos (goles, tarjetas, penales ni
                    ganador). Indica observaciones sobre la suspensión.
                  </AlertDescription>
                </Alert>
              )}
              {definicion === 'penales' && !isSuspendido && (
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
              {definicion === 'walkover' && !isSuspendido && (
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

          {!bloqueaEventosDeportivos && (
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
          )}

          {!bloqueaEventosDeportivos && (
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
          )}

          {!bloqueaEventosDeportivos && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Goles</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addGol} disabled={isSuspendido}>
                  <Plus className="mr-1 h-4 w-4" />
                  Gol
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {golesForm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin goles registrados.</p>
                ) : (
                  golesForm.map((g) => {
                    const opcionesJugadores = jugadoresOpcionesPorEquipoId.get(g.equipo_id) ?? []
                    return (
                    <div key={g.tempId} className="grid min-w-0 grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                      <div className="min-w-0 space-y-1 lg:col-span-3">
                        <Label className="text-xs">Equipo</Label>
                        <Select
                          value={g.equipo_id}
                          onValueChange={(v) =>
                            setGolesForm((prev) =>
                              prev.map((row) => (row.tempId === g.tempId ? { ...row, equipo_id: v, jugador_id: '' } : row)),
                            )
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
                      <div className="min-w-0 space-y-1 lg:col-span-5">
                        <Label className="text-xs">Jugador</Label>
                        <Select
                          value={g.jugador_id}
                          onValueChange={(v) => {
                            const meta = opcionesJugadores.find((j) => j.id === v)
                            setGolesForm((prev) =>
                              prev.map((row) =>
                                row.tempId === g.tempId
                                  ? { ...row, jugador_id: v, equipo_id: meta?.equipoId ?? row.equipo_id }
                                  : row,
                              ),
                            )
                          }}
                        >
                          <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {opcionesJugadores.map((j) => (
                              <SelectItem key={`${g.tempId}-${j.id}`} value={j.id} title={j.label}>
                                <span className="block max-w-[260px] truncate">{j.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 space-y-1 lg:col-span-4">
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
                      <div className="min-w-0 space-y-1 lg:col-span-3">
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
                        className="justify-self-end text-destructive lg:col-span-2"
                        onClick={() => setGolesForm((prev) => prev.filter((row) => row.tempId !== g.tempId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {g.tipo_gol === 'autogol' && (
                        <p className="text-xs text-amber-700 sm:col-span-2 lg:col-span-12">
                          Autogol: elige el jugador del equipo que cometió el autogol; el gol sumará al rival en el marcador.
                        </p>
                      )}
                    </div>
                    )
                  })
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
                  tarjetasForm.map((t) => {
                    const opcionesJugadores = jugadoresOpcionesPorEquipoId.get(t.equipo_id) ?? []
                    return (
                    <div key={t.tempId} className="grid min-w-0 grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                      <div className="min-w-0 space-y-1 lg:col-span-3">
                        <Label className="text-xs">Equipo</Label>
                        <Select
                          value={t.equipo_id}
                          onValueChange={(v) =>
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, equipo_id: v, jugador_id: '' } : row)),
                            )
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
                      <div className="min-w-0 space-y-1 lg:col-span-5">
                        <Label className="text-xs">Jugador</Label>
                        <Select
                          value={t.jugador_id}
                          onValueChange={(v) => {
                            const eq = opcionesJugadores.find((j) => j.id === v)?.equipoId ?? t.equipo_id
                            setTarjetasForm((prev) =>
                              prev.map((row) => (row.tempId === t.tempId ? { ...row, jugador_id: v, equipo_id: eq } : row)),
                            )
                          }}
                        >
                          <SelectTrigger className="w-full min-w-0 [&>span]:truncate">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {opcionesJugadores.map((j) => (
                              <SelectItem key={`${t.tempId}-${j.id}`} value={j.id} title={j.label}>
                                <span className="block max-w-[260px] truncate">{j.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0 space-y-1 lg:col-span-4">
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
                      <div className="min-w-0 space-y-1 lg:col-span-3">
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
                      <div className="min-w-0 space-y-1 lg:col-span-7">
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
                        className="justify-self-end text-destructive lg:col-span-2"
                        onClick={() => setTarjetasForm((prev) => prev.filter((row) => row.tempId !== t.tempId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
          )}

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

      {partido && el && ev && (
        <div className="pointer-events-none fixed -left-[10000px] top-0 opacity-0" aria-hidden>
          <div ref={printRef}>
            <ActaPrintDocument
              torneoNombre={torneo?.nombre ?? ''}
              categoriaNombre={categoria?.nombre ?? partido.categoriaNombre}
              jornada={partido.jornada}
              fecha={partido.fecha}
              hora={partido.hora}
              cancha={partido.cancha}
              localNombre={localNombre}
              visitNombre={visitNombre}
              localLogoUrl={localRow?.logo_url}
              localLogoPublicId={localRow?.logo_public_id}
              visitLogoUrl={visitRow?.logo_url}
              visitLogoPublicId={visitRow?.logo_public_id}
              localColor={localColor}
              visitColor={visitColor}
              golesLocal={marcador.local}
              golesVisitante={marcador.vis}
              penalesLocal={penL.trim() ? Number(penL) : null}
              penalesVisitante={penV.trim() ? Number(penV) : null}
              definicion={definicion}
              arbitroNombre={arbitroNombre}
              escuelaArbitral={escuelaArbitral}
              observaciones={observaciones}
              titularesLocal={[
                ...(jugLocalQ.data ?? [])
                  .filter((j) => titLocal.has(j.id) || ingLocal.has(j.id))
                  .map((j) => ({
                    nombre: j.nombre,
                    rol: titLocal.has(j.id) ? ('titular' as const) : ('ingreso_cambio' as const),
                  })),
              ]}
              titularesVisitante={[
                ...(jugVisQ.data ?? [])
                  .filter((j) => titVis.has(j.id) || ingVis.has(j.id))
                  .map((j) => ({
                    nombre: j.nombre,
                    rol: titVis.has(j.id) ? ('titular' as const) : ('ingreso_cambio' as const),
                  })),
              ]}
              cambios={cambiosForm
                .filter((c) => c.sale_id && c.entra_id)
                .map((c) => {
                  const pool = c.equipo_id === el ? jugLocalQ.data : jugVisQ.data
                  const sale = pool?.find((j) => j.id === c.sale_id)?.nombre ?? '—'
                  const entra = pool?.find((j) => j.id === c.entra_id)?.nombre ?? '—'
                  return { sale, entra, minuto: c.minuto }
                })}
              goles={golesForm
                .filter((g) => g.jugador_id)
                .map((g) => {
                  const pool = g.equipo_id === el ? jugLocalQ.data : jugVisQ.data
                  return {
                    jugador: pool?.find((j) => j.id === g.jugador_id)?.nombre ?? '—',
                    minuto: g.minuto,
                    tipo: g.tipo_gol ?? 'normal',
                  }
                })}
              tarjetas={tarjetasForm
                .filter((t) => t.jugador_id)
                .map((t) => {
                  const pool =
                    t.equipo_id === el ? jugLocalQ.data : t.equipo_id === ev ? jugVisQ.data : [...(jugLocalQ.data ?? []), ...(jugVisQ.data ?? [])]
                  return {
                    jugador: pool?.find((j) => j.id === t.jugador_id)?.nombre ?? '—',
                    tipo: t.tipo,
                    minuto: t.minuto,
                    motivo: t.motivo,
                  }
                })}
            />
          </div>
        </div>
      )}

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  )
}
