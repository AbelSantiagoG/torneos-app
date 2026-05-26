import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  AlertTriangle,
  Shuffle,
  Edit,
  Trash2,
  Plus,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatDateOnly, getDateOnlyTime } from '@/lib/utils'
import { translateUserError } from '@/lib/errorMessages'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { usePartidosTorneo, partidosTorneoQueryKey } from '@/features/partidos/usePartidosTorneo'
import {
  groupByFecha,
  countPartidosEnCategoria,
  countPartidosEnFase,
  generarFixtureCategoria,
  generarFixtureTodosContraTodosFase,
  eliminarFixtureFaseSeguro,
  eliminarJornadaFixtureSeguro,
  eliminarPartidoFixtureSeguro,
  updatePartido,
  updatePartidosJornada,
  createPartidoManual,
  assignPartidosCategoriaSinFase,
  upsertProgramacion,
  generarBorradorSorteo,
  type PartidosTorneoBundle,
  type SorteoBorradorSlot,
} from '@/features/partidos/partidosService'
import type { PartidoListaUi } from '@/features/partidos/partidosService'
import { isJugadoEstado } from '@/features/partidos/partidosUi'
import { countEquiposEnCategoria } from '@/features/equipos/equiposService'
import { useEquipos } from '@/features/equipos/useEquipos'
import { useCanchas } from '@/features/canchas/useCanchas'
import { useHorarios } from '@/features/horarios/useHorarios'
import { formatHoraUi, HORA_FRANJAS_PREDETERMINADAS, normalizeHoraDb } from '@/features/horarios/horariosService'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
import {
  listFasesPorCategoria,
  createFaseTorneo,
  archiveFaseTorneo,
  deleteFaseTorneo,
  getFaseDeleteSummary,
  setFaseActivaCategoria,
  tiposFaseOptions,
  puedeCrearSiguienteFase,
  type FaseDeleteSummary,
  type FaseTorneoUi,
} from '@/features/fases/fasesTorneoService'
import {
  isMissingFaseEquipos,
  listFaseEquipos,
  replaceFaseEquipos,
} from '@/features/fases/faseEquiposService'
import {
  agregarEquipoAGrupo,
  agregarEquiposRestantesAGrupo,
  crearGruposFase,
  eliminarGrupoFaseSeguro,
  generarFixtureGruposFase,
  isFasePorGrupos,
  listFixtureGruposFase,
  listGrupoEquipos,
  listGruposFase,
  moverEquipoAGrupo,
  quitarEquipoDeGrupoSeguro,
  repartirEquiposAleatorioFase,
  updateGrupoNombre,
  validarGruposAntesDeFixture,
  type FixtureGrupoUi,
  type GrupoEquipoUi,
  type GrupoFaseUi,
} from '@/features/grupos/gruposFaseService'

interface PartidosPageProps {
  onOpenActa?: (partidoId: string, categoriaId: string) => void
}

function initials(nombre: string) {
  return nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function findConflictIdsForFecha(list: PartidoListaUi[]): string[] {
  const conflicts: string[] = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const p1 = list[i]!
      const p2 = list[j]!
      if (p1.hora && p2.hora && p1.hora === p2.hora && p1.cancha && p2.cancha && p1.cancha === p2.cancha) {
        conflicts.push(p1.id, p2.id)
      }
    }
  }
  return conflicts
}

function TeamAvatar({
  nombre,
  color,
  logoUrl,
  logoPublicId,
}: {
  nombre: string
  color: string
  logoUrl?: string | null
  logoPublicId?: string | null
}) {
  const src = resolveDisplayImageUrl(logoPublicId, logoUrl, displayImagePresets.equipoLogoThumb())
  if (src) {
    return <img src={src} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {initials(nombre || '?')}
    </div>
  )
}

function ResultadoPartido({ partido, played }: { partido: PartidoListaUi; played?: boolean }) {
  const definicion = String(partido.definicion ?? '').toLowerCase()
  if (definicion === 'suspendido') {
    return <span className="font-semibold text-warning">Suspendido</span>
  }
  const debeMostrarMarcador =
    definicion === 'walkover' ||
    definicion === 'penales' ||
    Boolean(partido.resultadoNota) ||
    (played && (partido.golesLocal != null || partido.golesVisitante != null))
  if (!debeMostrarMarcador) {
    return <span className="text-muted-foreground">vs</span>
  }
  return (
    <div className="text-center">
      <span className="font-bold tabular-nums">
        {partido.golesLocal ?? '—'} - {partido.golesVisitante ?? '—'}
      </span>
      {definicion === 'walkover' || partido.resultadoNota ? (
        <p className="mt-0.5 text-xs font-normal text-muted-foreground">
          {partido.resultadoNota || 'Ganador por W'}
        </p>
      ) : null}
    </div>
  )
}

export function PartidosPage({ onOpenActa }: PartidosPageProps) {
  const qc = useQueryClient()
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedFixtureFase, setSelectedFixtureFase] = useState('')
  const [activeTab, setActiveTab] = useState('categoria')
  const [fixtureOpen, setFixtureOpen] = useState(false)
  const [generandoFixture, setGenerandoFixture] = useState(false)
  const [sorteoCategoria, setSorteoCategoria] = useState('')
  const [sorteoFecha, setSorteoFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [sorteoDias, setSorteoDias] = useState('14')
  const [sorteoDrafts, setSorteoDrafts] = useState<Record<string, SorteoBorradorSlot>>({})
  const [guardandoSorteo, setGuardandoSorteo] = useState(false)
  const [guardandoProgramacion, setGuardandoProgramacion] = useState(false)

  const [editPartido, setEditPartido] = useState<PartidoListaUi | null>(null)
  const [editJornada, setEditJornada] = useState('')
  const [editOrden, setEditOrden] = useState('')
  const [editLocal, setEditLocal] = useState('')
  const [editVisit, setEditVisit] = useState('')
  const [editGrupoId, setEditGrupoId] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [nuevoLocal, setNuevoLocal] = useState('')
  const [nuevoVisit, setNuevoVisit] = useState('')
  const [nuevoJornada, setNuevoJornada] = useState('1')
  const [nuevoOrden, setNuevoOrden] = useState('0')
  const [manualFaseId, setManualFaseId] = useState('')
  const [manualGrupoId, setManualGrupoId] = useState('')
  const [createJornadaOpen, setCreateJornadaOpen] = useState(false)
  const [jornadaDraft, setJornadaDraft] = useState('1')
  const [deleteJornada, setDeleteJornada] = useState<{
    jornada: number
    grupoId?: string | null
    grupoNombre?: string | null
  } | null>(null)
  const [deleteJornadaLoading, setDeleteJornadaLoading] = useState(false)
  const [deleteFixtureLoading, setDeleteFixtureLoading] = useState(false)
  const [editJornadaOpen, setEditJornadaOpen] = useState(false)
  const [editJornadaRows, setEditJornadaRows] = useState<
    { id: string; label: string; jornada: string; orden: string }[]
  >([])
  const [faseDialogOpen, setFaseDialogOpen] = useState(false)
  const [siguienteFaseOpen, setSiguienteFaseOpen] = useState(false)
  const [faseNombre, setFaseNombre] = useState('')
  const [faseTipo, setFaseTipo] = useState('')
  const [faseOrden, setFaseOrden] = useState('')
  const [faseDescripcion, setFaseDescripcion] = useState('')
  const [faseReinicia, setFaseReinicia] = useState(false)
  const [grupoCantidad, setGrupoCantidad] = useState('2')
  const [grupoAsignacion, setGrupoAsignacion] = useState('aleatoria')
  const [grupoLoading, setGrupoLoading] = useState(false)
  const [grupoNombresDraft, setGrupoNombresDraft] = useState<Record<string, string>>({})
  const [grupoEquipoDraft, setGrupoEquipoDraft] = useState<Record<string, string>>({})
  const [grupoMoverDraft, setGrupoMoverDraft] = useState<Record<string, string>>({})
  const [clasificadosModo, setClasificadosModo] = useState('manual')
  const [clasificadosCriterio, setClasificadosCriterio] = useState('primeros_y_segundos')
  const [faseOrigenId, setFaseOrigenId] = useState('')
  const [faseClasificadosTotal, setFaseClasificadosTotal] = useState('8')
  const [faseClasificadosPorGrupo, setFaseClasificadosPorGrupo] = useState('2')
  const [faseCuadrangularesCantidad, setFaseCuadrangularesCantidad] = useState('2')
  const [faseModalidad, setFaseModalidad] = useState('solo_ida')
  const [faseCruces, setFaseCruces] = useState('primero_vs_ultimo')
  const [faseTercerPuesto, setFaseTercerPuesto] = useState(false)
  const [deleteFaseTarget, setDeleteFaseTarget] = useState<{
    fase: FaseTorneoUi
    summary: FaseDeleteSummary
  } | null>(null)
  const [faseDeleting, setFaseDeleting] = useState(false)

  const [progPartido, setProgPartido] = useState<PartidoListaUi | null>(null)
  const [progFecha, setProgFecha] = useState('')
  const [progHora, setProgHora] = useState('09:00')
  const [progHoraFin, setProgHoraFin] = useState('')
  const [progCancha, setProgCancha] = useState('')
  const [progEstado, setProgEstado] = useState('programado')
  const [progObservaciones, setProgObservaciones] = useState('')

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)
  const { data: bundle, isLoading: parLoading, error: parError } = usePartidosTorneo(torneoId)

  const fixture = bundle?.fixture ?? []
  const programados = bundle?.programados ?? []
  const programmedIds = useMemo(() => new Set(programados.map((p) => p.id)), [programados])

  const { data: equiposCat = [] } = useEquipos(selectedCategoria || undefined, torneoId)
  const { data: canchas = [] } = useCanchas(torneoId)
  const { data: horariosLista = [] } = useHorarios(torneoId)

  const { data: fasesList = [], refetch: refetchFases } = useQuery({
    queryKey: ['fases-categoria', selectedCategoria],
    enabled: Boolean(selectedCategoria),
    queryFn: () => listFasesPorCategoria(selectedCategoria),
  })

  const siguienteFaseQ = useQuery({
    queryKey: ['puede-siguiente-fase', selectedCategoria],
    enabled: Boolean(selectedCategoria),
    queryFn: () => puedeCrearSiguienteFase(selectedCategoria),
  })

  useEffect(() => {
    if (parError) toast.error(translateUserError(parError, 'fixture'))
  }, [parError])

  useEffect(() => {
    if (categorias.length && !selectedCategoria) {
      setSelectedCategoria(categorias[0]!.id)
    }
  }, [categorias, selectedCategoria])

  useEffect(() => {
    if (categorias.length && !sorteoCategoria) {
      setSorteoCategoria(categorias[0]!.id)
    }
  }, [categorias, sorteoCategoria])

  useEffect(() => {
    setSorteoDrafts({})
  }, [sorteoCategoria])

  useEffect(() => {
    setSelectedFixtureFase('')
  }, [selectedCategoria])

  const faseActualFixture = useMemo(() => {
    if (!fasesList.length) return null
    if (selectedFixtureFase) return fasesList.find((f) => f.id === selectedFixtureFase) ?? null
    return fasesList.find((f) => f.activa) ?? fasesList[0] ?? null
  }, [fasesList, selectedFixtureFase])

  const fixtureEsPorGrupos = isFasePorGrupos(faseActualFixture?.tipo)
  const gruposFaseQueryKey = ['grupos-fase', faseActualFixture?.id] as const
  const grupoEquiposQueryKey = ['grupo-equipos', faseActualFixture?.id] as const
  const fixtureGruposQueryKey = ['fixture-grupos', faseActualFixture?.id] as const

  const {
    data: gruposFase = [],
    refetch: refetchGruposFase,
    isLoading: gruposLoading,
  } = useQuery<GrupoFaseUi[]>({
    queryKey: gruposFaseQueryKey,
    enabled: Boolean(faseActualFixture?.id && fixtureEsPorGrupos),
    queryFn: () => listGruposFase(faseActualFixture!.id),
  })

  const { data: grupoEquipos = [], refetch: refetchGrupoEquipos } = useQuery<GrupoEquipoUi[]>({
    queryKey: grupoEquiposQueryKey,
    enabled: Boolean(faseActualFixture?.id && fixtureEsPorGrupos),
    queryFn: () => listGrupoEquipos(faseActualFixture!.id),
  })

  const { data: fixtureGrupos = [], refetch: refetchFixtureGrupos } = useQuery<FixtureGrupoUi[]>({
    queryKey: fixtureGruposQueryKey,
    enabled: Boolean(faseActualFixture?.id && fixtureEsPorGrupos),
    queryFn: () => listFixtureGruposFase(faseActualFixture!.id),
  })

  const partidosCategoria = useMemo(
    () =>
      selectedCategoria
        ? fixture.filter(
            (p) =>
              p.categoriaId === selectedCategoria &&
              (!selectedFixtureFase || (p.faseTorneoId ?? '') === selectedFixtureFase),
          )
        : [],
    [fixture, selectedCategoria, selectedFixtureFase],
  )

  const partidosSorteo = useMemo(
    () =>
      sorteoCategoria
        ? fixture.filter(
            (p) =>
              p.categoriaId === sorteoCategoria &&
              (sorteoCategoria !== selectedCategoria || !faseActualFixture || (p.faseTorneoId ?? '') === faseActualFixture.id),
          )
        : [],
    [faseActualFixture, fixture, selectedCategoria, sorteoCategoria],
  )

  const pendientesSorteo = useMemo(
    () => partidosSorteo.filter((p) => !programmedIds.has(p.id) && !isJugadoEstado(p.estado)),
    [partidosSorteo, programmedIds],
  )

  const jornadas = useMemo(
    () => [...new Set(partidosCategoria.map((p) => p.jornada))].sort((a, b) => a - b),
    [partidosCategoria],
  )

  const fixtureGruposPorGrupo = useMemo(() => {
    const gruposMeta = new Map(gruposFase.map((grupo) => [grupo.id, grupo]))
    const viewMap = new Map(fixtureGrupos.map((partido) => [partido.partidoId, partido]))
    const manuales = fixtureEsPorGrupos
      ? partidosCategoria.map((partido): FixtureGrupoUi => {
          const meta = viewMap.get(partido.id)
          const grupoId = partido.grupoId ?? meta?.grupoId ?? ''
          const grupo = grupoId ? gruposMeta.get(grupoId) : null
          return {
            partidoId: partido.id,
            grupoId,
            grupoNombre: grupo?.nombre ?? meta?.grupoNombre ?? 'Partidos sin grupo asignado',
            grupoOrden: grupo?.orden ?? meta?.grupoOrden ?? 999,
            jornada: partido.jornada || meta?.jornada || 0,
            orden: partido.orden ?? meta?.orden ?? 0,
            estado: partido.estado || meta?.estado || 'pendiente_programar',
            fecha: partido.fecha || meta?.fecha || '',
            hora: partido.hora || meta?.hora || '',
            cancha: partido.cancha || meta?.cancha || '',
            equipoLocalNombre: partido.equipoLocalNombre || meta?.equipoLocalNombre || 'Local',
            equipoVisitanteNombre: partido.equipoVisitanteNombre || meta?.equipoVisitanteNombre || 'Visitante',
            golesLocal: partido.golesLocal ?? meta?.golesLocal ?? null,
            golesVisitante: partido.golesVisitante ?? meta?.golesVisitante ?? null,
            definicion: partido.definicion ?? meta?.definicion ?? null,
            resultadoNota: partido.resultadoNota ?? meta?.resultadoNota ?? null,
          }
        })
      : fixtureGrupos
    const seen = new Set<string>()
    const groups = new Map<string, FixtureGrupoUi[]>()
    for (const partido of [...manuales, ...fixtureGrupos]) {
      if (seen.has(partido.partidoId)) continue
      seen.add(partido.partidoId)
      const key = partido.grupoId || partido.grupoNombre || 'sin-grupo'
      groups.set(key, [...(groups.get(key) ?? []), partido])
    }
    return [...groups.entries()].map(([key, partidos]) => ({
      key,
      grupoId: partidos[0]?.grupoId || null,
      nombre: partidos[0]?.grupoNombre || 'Sin grupo asignado',
      orden: partidos[0]?.grupoOrden ?? 0,
      partidos: partidos.sort((a, b) => a.jornada - b.jornada || a.orden - b.orden),
    })).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  }, [fixtureEsPorGrupos, fixtureGrupos, gruposFase, partidosCategoria])

  const fixtureGrupoPorPartido = useMemo(
    () => new Map(fixtureGrupos.map((p) => [p.partidoId, p])),
    [fixtureGrupos],
  )

  const sorteoAgrupado = useMemo(() => {
    const esPorGruposEnSorteo = fixtureEsPorGrupos && sorteoCategoria === selectedCategoria
    if (!esPorGruposEnSorteo) {
      const jornadasMap = new Map<number, PartidoListaUi[]>()
      for (const partido of pendientesSorteo) {
        const jornada = partido.jornada || 0
        jornadasMap.set(jornada, [...(jornadasMap.get(jornada) ?? []), partido])
      }
      return [
        {
          key: 'sin-grupo',
          nombre: '',
          orden: 0,
          jornadas: [...jornadasMap.entries()]
            .map(([jornada, partidos]) => ({ jornada, partidos: partidos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) }))
            .sort((a, b) => a.jornada - b.jornada),
        },
      ]
    }

    const gruposMap = new Map<string, { key: string; nombre: string; orden: number; jornadas: Map<number, PartidoListaUi[]> }>()
    for (const partido of pendientesSorteo) {
      const meta = fixtureGrupoPorPartido.get(partido.id)
      const grupo = partido.grupoId ? gruposFase.find((item) => item.id === partido.grupoId) : null
      const key = partido.grupoId || meta?.grupoId || meta?.grupoNombre || 'sin-grupo'
      const current =
        gruposMap.get(key) ??
        {
          key,
          nombre: grupo?.nombre ?? meta?.grupoNombre ?? 'Partidos sin grupo asignado',
          orden: grupo?.orden ?? meta?.grupoOrden ?? 999,
          jornadas: new Map<number, PartidoListaUi[]>(),
        }
      const jornada = partido.jornada || meta?.jornada || 0
      current.jornadas.set(jornada, [...(current.jornadas.get(jornada) ?? []), partido])
      gruposMap.set(key, current)
    }

    return [...gruposMap.values()]
      .map((grupo) => ({
        key: grupo.key,
        nombre: grupo.nombre,
        orden: grupo.orden,
        jornadas: [...grupo.jornadas.entries()]
          .map(([jornada, partidos]) => ({ jornada, partidos: partidos.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) }))
          .sort((a, b) => a.jornada - b.jornada),
      }))
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  }, [fixtureEsPorGrupos, fixtureGrupoPorPartido, gruposFase, pendientesSorteo, selectedCategoria, sorteoCategoria])

  const grupoEquiposPorGrupo = useMemo(() => {
    const groups = new Map<string, GrupoEquipoUi[]>()
    for (const item of grupoEquipos) {
      groups.set(item.grupoId, [...(groups.get(item.grupoId) ?? []), item])
    }
    return groups
  }, [grupoEquipos])

  const manualFase = useMemo(
    () => fasesList.find((fase) => fase.id === manualFaseId) ?? null,
    [fasesList, manualFaseId],
  )
  const manualEsPorGrupos = isFasePorGrupos(manualFase?.tipo)

  const equiposManual = useMemo(() => {
    if (!manualEsPorGrupos) return equiposCat.map((equipo) => ({ id: equipo.id, nombre: equipo.nombre, sigla: equipo.sigla ?? null }))
    if (!manualGrupoId) return []
    return (grupoEquiposPorGrupo.get(manualGrupoId) ?? []).map((item) => ({
      id: item.equipoId,
      nombre: item.equipoNombre,
      sigla: item.sigla,
    }))
  }, [equiposCat, grupoEquiposPorGrupo, manualEsPorGrupos, manualGrupoId])

  const equiposEdit = useMemo(() => {
    if (!fixtureEsPorGrupos) return equiposCat.map((equipo) => ({ id: equipo.id, nombre: equipo.nombre, sigla: equipo.sigla ?? null }))
    if (!editGrupoId) return []
    return (grupoEquiposPorGrupo.get(editGrupoId) ?? []).map((item) => ({
      id: item.equipoId,
      nombre: item.equipoNombre,
      sigla: item.sigla,
    }))
  }, [editGrupoId, equiposCat, fixtureEsPorGrupos, grupoEquiposPorGrupo])

  const equiposAsignadosEnFase = useMemo(
    () => new Set(grupoEquipos.map((item) => item.equipoId)),
    [grupoEquipos],
  )

  const equiposDisponiblesParaGrupo = useMemo(
    () => equiposCat.filter((equipo) => equipo.estadoEquipo !== 'inactivo' && !equiposAsignadosEnFase.has(equipo.id)),
    [equiposCat, equiposAsignadosEnFase],
  )

  const gruposConEquiposAsignados = gruposFase.length > 0 && grupoEquipos.length > 0

  const partidosPorFecha = useMemo(() => groupByFecha(programados), [programados])

  const fechasOrdenadas = useMemo(
    () =>
      Object.keys(partidosPorFecha)
        .filter((k) => k !== 'sin-fecha')
        .sort((a, b) => {
          const ta = getDateOnlyTime(a)
          const tb = getDateOnlyTime(b)
          if (Number.isNaN(ta) || Number.isNaN(tb)) return a.localeCompare(b)
          return ta - tb
        }),
    [partidosPorFecha],
  )

  const comparePartidosPorHora = (a: PartidoListaUi, b: PartidoListaUi) => {
    const ha = a.hora || '99:99'
    const hb = b.hora || '99:99'
    return ha.localeCompare(hb) || a.equipoLocalNombre.localeCompare(b.equipoLocalNombre)
  }

  const horasParaProgramacion = useMemo(() => {
    const rows = horariosLista.filter((h) => h.activo !== false)
    if (rows.length) return rows.map((h) => ({ id: h.id, hora: h.hora }))
    return HORA_FRANJAS_PREDETERMINADAS.map((h, i) => ({ id: `def-${i}`, hora: h.hora }))
  }, [horariosLista])

  const openProgramacion = (p: PartidoListaUi, draft?: SorteoBorradorSlot | null) => {
    const d = draft ?? sorteoDrafts[p.id]
    setProgPartido(p)
    setProgFecha((d?.fecha ?? p.fecha)?.slice(0, 10) || '')
    const h = (d?.hora ?? p.hora) || '09:00'
    setProgHora(h.length >= 5 ? h.slice(0, 5) : h)
    const hf = d?.horaFin ?? p.horaFin ?? ''
    setProgHoraFin(hf && hf.length >= 5 ? hf.slice(0, 5) : hf ? hf : '')
    setProgCancha((d?.canchaId ?? p.canchaId) || '')
    setProgEstado(p.estadoProgramacion || 'programado')
    setProgObservaciones(p.observaciones || '')
  }

  const invalidatePartidos = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: partidosTorneoQueryKey(torneoId) })
  }

  const updatePartidosCache = (updater: (old: PartidosTorneoBundle) => PartidosTorneoBundle) => {
    if (!torneoId) return
    qc.setQueryData<PartidosTorneoBundle>(partidosTorneoQueryKey(torneoId), (old) => (old ? updater(old) : old))
  }

  const removePartidosFromCache = (partidoIds: string[]) => {
    const ids = new Set(partidoIds.filter(Boolean))
    if (!ids.size) return
    updatePartidosCache((old) => ({
      fixture: old.fixture.filter((p) => !ids.has(p.id)),
      programados: old.programados.filter((p) => !ids.has(p.id)),
    }))
    qc.setQueryData<FixtureGrupoUi[]>(fixtureGruposQueryKey, (old = []) => old.filter((p) => !ids.has(p.partidoId)))
  }

  const isForceDeleteError = (error: unknown) => {
    const msg = String((error as Error)?.message ?? error ?? '').toLowerCase()
    return [
      'asociad',
      'programaci',
      'acta',
      'jugad',
      'goles',
      'tarjetas',
      'forzar',
      'confirm',
      'relacionad',
    ].some((token) => msg.includes(token))
  }

  const requireFaseEspecifica = (accion = 'realizar esta acciÃ³n'): FaseTorneoUi | null => {
    if (!selectedFixtureFase) {
      toast.error(`Selecciona una fase especÃ­fica para ${accion}.`)
      return null
    }
    const fase = fasesList.find((item) => item.id === selectedFixtureFase) ?? null
    if (!fase) {
      toast.error('Selecciona una fase especÃ­fica.')
      return null
    }
    return fase
  }

  const selectedFaseIdForRpc = () => selectedFixtureFase || null

  const resetFaseForm = () => {
    setFaseNombre('')
    setFaseTipo('')
    setFaseOrden('')
    setFaseDescripcion('')
    setFaseReinicia(false)
    setClasificadosModo('manual')
    setClasificadosCriterio('primeros_y_segundos')
    setFaseOrigenId('')
    setFaseClasificadosTotal('8')
    setFaseClasificadosPorGrupo('2')
    setFaseCuadrangularesCantidad('2')
    setFaseModalidad('solo_ida')
    setFaseCruces('primero_vs_ultimo')
    setFaseTercerPuesto(false)
  }

  const faseOrigenSeleccionada = () =>
    fasesList.find((fase) => fase.id === faseOrigenId) ?? siguienteFaseQ.data?.faseActual ?? fasesList[fasesList.length - 1] ?? null

  const isCantidadEliminatoriaValida = (value: number) => [2, 4, 8, 16, 32].includes(value)

  const buildFaseDescripcion = (esSiguiente: boolean) => {
    const partes = [faseDescripcion.trim()].filter(Boolean)
    if (!esSiguiente) return partes.join('\n') || null
    const origen = faseOrigenSeleccionada()
    partes.push(
      [
        'Configuración siguiente fase:',
        `origen=${origen?.nombre ?? 'sin fase origen'}`,
        `fuente=${clasificadosModo}`,
        `criterio=${clasificadosCriterio}`,
        `reinicia_tabla=${faseReinicia ? 'si' : 'no'}`,
        `clasificados_total=${faseClasificadosTotal}`,
        `clasificados_por_grupo=${faseClasificadosPorGrupo}`,
        `cuadrangulares=${faseCuadrangularesCantidad}`,
        `modalidad=${faseModalidad}`,
        `cruces=${faseCruces}`,
        `tercer_puesto=${faseTercerPuesto ? 'si' : 'no'}`,
      ].join(' | '),
    )
    return partes.join('\n')
  }

  const openCrearJornada = () => {
    if (!requireFaseEspecifica('realizar esta acciÃ³n')) return
    const next = jornadas.length ? Math.max(...jornadas) + 1 : 1
    setJornadaDraft(String(next))
    setCreateJornadaOpen(true)
  }

  const confirmarCrearJornada = () => {
    const jornada = Number(jornadaDraft)
    if (!Number.isInteger(jornada) || jornada < 1) {
      toast.error('Indica un número de jornada válido.')
      return
    }
    setNuevoJornada(String(jornada))
    setNuevoOrden('0')
    setManualFaseId(selectedFixtureFase)
    setManualGrupoId('')
    setNuevoLocal('')
    setNuevoVisit('')
    setCreateJornadaOpen(false)
    setCreateOpen(true)
  }

  const openCrearPartidoEnJornada = (jornada: number, grupoId?: string | null) => {
    if (!requireFaseEspecifica('crear partidos')) return
    setNuevoJornada(String(jornada))
    setNuevoOrden('0')
    setManualFaseId(selectedFixtureFase)
    setManualGrupoId(grupoId ?? '')
    setNuevoLocal('')
    setNuevoVisit('')
    setCreateOpen(true)
  }

  const openDeleteJornada = (jornada: number, grupoId?: string | null, grupoNombre?: string | null) => {
    if (!selectedCategoria) return
    if (!requireFaseEspecifica('realizar esta acciÃ³n')) return
    setDeleteJornada({ jornada, grupoId: grupoId ?? null, grupoNombre: grupoNombre ?? null })
  }

  const confirmarDeleteJornada = async () => {
    if (!selectedCategoria || !deleteJornada) return
    setDeleteJornadaLoading(true)
    const faseId = selectedFaseIdForRpc()
    const partidoIds = fixtureEsPorGrupos
      ? fixtureGrupos
          .filter((p) => p.jornada === deleteJornada.jornada && (!deleteJornada.grupoId || p.grupoId === deleteJornada.grupoId))
          .map((p) => p.partidoId)
      : partidosCategoria.filter((p) => p.jornada === deleteJornada.jornada).map((p) => p.id)
    const exec = (forzar: boolean) =>
      eliminarJornadaFixtureSeguro({
        categoriaId: selectedCategoria,
        faseTorneoId: faseId,
        jornada: deleteJornada.jornada,
        grupoId: deleteJornada.grupoId ?? null,
        forzar,
      })
    try {
      try {
        await exec(false)
      } catch (e) {
        if (!isForceDeleteError(e)) throw e
        const ok = confirm('Esta jornada tiene información asociada. Confirma si deseas eliminarla.')
        if (!ok) return
        await exec(true)
      }
      toast.success('Jornada eliminada.')
      removePartidosFromCache(partidoIds)
      setDeleteJornada(null)
    } catch (e) {
      toast.error('No se pudo eliminar la jornada.')
    } finally {
      setDeleteJornadaLoading(false)
    }
  }

  const openEditJornada = (jornada: number, partidos: PartidoListaUi[]) => {
    setEditJornadaRows(
      [...partidos]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((p) => ({
          id: p.id,
          label: `${p.equipoLocalNombre} vs ${p.equipoVisitanteNombre}`,
          jornada: String(p.jornada || jornada),
          orden: String(p.orden ?? 0),
        })),
    )
    setEditJornadaOpen(true)
  }

  const saveEditJornada = async () => {
    try {
      const updates = editJornadaRows.map((row, idx) => ({
        id: row.id,
        jornada: Number(row.jornada) || 1,
        orden: Number(row.orden) || idx + 1,
      }))
      await updatePartidosJornada(updates)
      toast.success('Jornada actualizada.')
      setEditJornadaOpen(false)
      invalidatePartidos()
    } catch (e) {
      toast.error('No se pudo guardar la jornada.')
    }
  }

  const handleCrearFase = async (esSiguiente = false) => {
    if (!selectedCategoria) {
      toast.error('Selecciona una categoría en «Por categoría».')
      return
    }
    if (!faseNombre.trim()) {
      toast.error('Indica un nombre para la fase.')
      return
    }
    if (!faseTipo) {
      toast.error('Elige el tipo de fase.')
      return
    }
    const origen = esSiguiente ? faseOrigenSeleccionada() : null
    if (esSiguiente && !origen) {
      toast.error('Selecciona la fase anterior de referencia.')
      return
    }
    if (esSiguiente && faseTipo === 'todos_contra_todos' && clasificadosModo === 'clasificacion') {
      toast.error('Todos contra todos como siguiente fase debe configurarse con selección manual, todos los equipos o sin equipos.')
      return
    }
    if (esSiguiente && faseTipo === 'eliminatoria_directa' && clasificadosModo !== 'sin_equipos') {
      const cantidad = Number(faseClasificadosTotal)
      if (!isCantidadEliminatoriaValida(cantidad)) {
        toast.error('La eliminación directa solo permite 2, 4, 8, 16 o 32 clasificados.')
        return
      }
      if (clasificadosModo === 'todos' && cantidad > equiposCat.length) {
        toast.error('No puedes clasificar más equipos de los existentes.')
        return
      }
    }
    if (esSiguiente && faseTipo === 'cuadrangulares') {
      const cantidad = Number(faseCuadrangularesCantidad)
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        toast.error('Indica cuántos cuadrangulares quieres crear.')
        return
      }
      if (clasificadosModo === 'clasificacion' && origen && isFasePorGrupos(origen.tipo)) {
        const gruposOrigen = await listGruposFase(origen.id)
        if (gruposOrigen.length > 8) {
          toast.error('No se puede crear cuadrangulares automáticamente si la fase anterior tiene más de 8 grupos.')
          return
        }
      }
    }
    try {
      const faseId = await createFaseTorneo({
        torneo_id: torneoId,
        categoria_id: selectedCategoria,
        nombre: faseNombre.trim(),
        tipo: faseTipo,
        orden: faseOrden.trim() ? Number(faseOrden) : undefined,
        descripcion: buildFaseDescripcion(esSiguiente),
        reinicia_tabla: faseReinicia,
        activa: esSiguiente ? true : undefined,
        fase_origen_id: esSiguiente ? origen?.id ?? null : null,
      })
      if (esSiguiente && clasificadosModo === 'todos') {
        try {
          await replaceFaseEquipos({
            faseTorneoId: faseId,
            equipoIds: equiposCat.map((equipo) => equipo.id),
            metodo: 'todos',
            origenFaseId: origen?.id ?? null,
          })
        } catch (err) {
          if (isMissingFaseEquipos(err)) {
            toast.warning('Fase creada. Para guardar equipos participantes falta aplicar la migración fase_equipos.')
          } else {
            throw err
          }
        }
      }
      toast.success(esSiguiente ? 'Siguiente fase creada.' : 'Fase creada.')
      setFaseDialogOpen(false)
      setSiguienteFaseOpen(false)
      resetFaseForm()
      void refetchFases()
      void siguienteFaseQ.refetch()
    } catch (e) {
      toast.error('No se pudo crear la fase. Revisa los campos obligatorios.')
    }
  }

  const handleActivarFase = async (faseId: string) => {
    if (!selectedCategoria) return
    try {
      await setFaseActivaCategoria(selectedCategoria, faseId)
      toast.success('Fase activa actualizada.')
      void refetchFases()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    }
  }

  const openDeleteFase = async (fase: FaseTorneoUi) => {
    setFaseDeleting(true)
    try {
      const summary = await getFaseDeleteSummary(fase.id)
      setDeleteFaseTarget({ fase, summary })
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setFaseDeleting(false)
    }
  }

  const confirmarDeleteFase = async () => {
    if (!deleteFaseTarget) return
    setFaseDeleting(true)
    try {
      await deleteFaseTorneo(deleteFaseTarget.fase.id, deleteFaseTarget.fase.categoria_id)
      toast.success('Fase eliminada.')
      setDeleteFaseTarget(null)
      void refetchFases()
      void siguienteFaseQ.refetch()
      invalidatePartidos()
    } catch {
      toast.error('No se puede eliminar esta fase porque tiene información asociada. Elimina primero los partidos o archiva la fase.')
    } finally {
      setFaseDeleting(false)
    }
  }

  const archivarFase = async (fase: FaseTorneoUi) => {
    try {
      await archiveFaseTorneo(fase.id, fase.categoria_id)
      toast.success('Fase archivada.')
      void refetchFases()
    } catch {
      toast.error('No se pudo archivar la fase.')
    }
  }

  const refetchGrupos = () => {
    void refetchGruposFase()
    void refetchGrupoEquipos()
  }

  const refetchFixturePorGrupos = () => {
    void refetchFixtureGrupos()
    void refetchGruposFase()
  }

  const confirmarCambioGrupo = (grupo?: GrupoFaseUi | null): boolean => {
    if (!grupo || grupo.partidosJugados <= 0) return true
    return confirm('Esta fase ya tiene partidos jugados. Modificar el grupo puede dejar el fixture inconsistente. ¿Deseas continuar?')
  }

  const handleCrearGrupos = async () => {
    if (!faseActualFixture) {
      toast.error('Selecciona una fase.')
      return
    }
    const cantidad = Number(grupoCantidad)
    setGrupoLoading(true)
    try {
      await crearGruposFase(faseActualFixture.id, cantidad)
      toast.success('Grupos creados.')
      refetchGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleRepartirEquipos = async () => {
    if (!faseActualFixture) return
    if (!gruposFase.length) {
      toast.error('Primero debes crear los grupos de esta fase.')
      return
    }
    setGrupoLoading(true)
    try {
      await repartirEquiposAleatorioFase(faseActualFixture.id)
      toast.success('Equipos repartidos.')
      refetchGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleRenombrarGrupo = async (grupo: GrupoFaseUi) => {
    if (!confirmarCambioGrupo(grupo)) return
    const nombre = grupoNombresDraft[grupo.id] ?? grupo.nombre
    setGrupoLoading(true)
    try {
      await updateGrupoNombre(grupo.id, nombre)
      toast.success('Grupo actualizado.')
      refetchGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleEliminarGrupo = async (grupo: GrupoFaseUi) => {
    if (grupo.partidosCount > 0) {
      toast.error('No se puede eliminar el grupo porque ya tiene partidos generados.')
      return
    }
    const equiposGrupo = grupoEquiposPorGrupo.get(grupo.id) ?? []
    if (
      equiposGrupo.length > 0 &&
      !confirm('Este grupo tiene equipos asignados. Si lo eliminas, esos equipos quedarán sin grupo en esta fase. ¿Deseas continuar?')
    ) {
      return
    }
    setGrupoLoading(true)
    const previousGrupos = qc.getQueryData<GrupoFaseUi[]>(gruposFaseQueryKey)
    const previousEquipos = qc.getQueryData<GrupoEquipoUi[]>(grupoEquiposQueryKey)
    qc.setQueryData<GrupoFaseUi[]>(gruposFaseQueryKey, (old = []) => old.filter((item) => item.id !== grupo.id))
    qc.setQueryData<GrupoEquipoUi[]>(grupoEquiposQueryKey, (old = []) => old.filter((item) => item.grupoId !== grupo.id))
    try {
      await eliminarGrupoFaseSeguro(grupo.id)
      toast.success('Grupo eliminado.')
      refetchGrupos()
    } catch (e) {
      qc.setQueryData(gruposFaseQueryKey, previousGrupos)
      qc.setQueryData(grupoEquiposQueryKey, previousEquipos)
      const msg = translateUserError(e, 'fixture')
      toast.error(msg.toLowerCase().includes('partido') ? 'No se puede eliminar el grupo porque ya tiene partidos generados.' : msg)
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleAgregarEquipoGrupo = async (grupo: GrupoFaseUi) => {
    if (!faseActualFixture || !confirmarCambioGrupo(grupo)) return
    const equipoId = grupoEquipoDraft[grupo.id]
    if (!equipoId) {
      toast.error('Selecciona un equipo.')
      return
    }
    setGrupoLoading(true)
    try {
      await agregarEquipoAGrupo(faseActualFixture.id, grupo.id, equipoId)
      setGrupoEquipoDraft((prev) => ({ ...prev, [grupo.id]: '' }))
      toast.success('Equipo agregado al grupo.')
      refetchGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleQuitarEquipoGrupo = async (grupo: GrupoFaseUi, item: GrupoEquipoUi) => {
    if (!confirmarCambioGrupo(grupo)) return
    setGrupoLoading(true)
    const previousEquipos = qc.getQueryData<GrupoEquipoUi[]>(grupoEquiposQueryKey)
    const previousGrupos = qc.getQueryData<GrupoFaseUi[]>(gruposFaseQueryKey)
    qc.setQueryData<GrupoEquipoUi[]>(grupoEquiposQueryKey, (old = []) => old.filter((row) => row.id !== item.id))
    qc.setQueryData<GrupoFaseUi[]>(gruposFaseQueryKey, (old = []) =>
      old.map((row) =>
        row.id === grupo.id ? { ...row, equiposCount: Math.max(0, row.equiposCount - 1) } : row,
      ),
    )
    try {
      await quitarEquipoDeGrupoSeguro(item.grupoId, item.equipoId)
      toast.success('Equipo retirado del grupo.')
      void refetchGrupoEquipos()
      void refetchGruposFase()
    } catch (e) {
      qc.setQueryData(grupoEquiposQueryKey, previousEquipos)
      qc.setQueryData(gruposFaseQueryKey, previousGrupos)
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleAgregarRestantesGrupo = async (grupo: GrupoFaseUi) => {
    if (!confirmarCambioGrupo(grupo)) return
    const pendientes = equiposDisponiblesParaGrupo.length
    if (pendientes <= 0) {
      toast.message('No hay equipos pendientes por asignar.')
      return
    }
    setGrupoLoading(true)
    try {
      await agregarEquiposRestantesAGrupo(grupo.id)
      toast.success(`Se agregaron ${pendientes} equipos restantes.`)
      void refetchGrupoEquipos()
      void refetchGruposFase()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const handleMoverEquipoGrupo = async (grupo: GrupoFaseUi, item: GrupoEquipoUi) => {
    if (!faseActualFixture || !confirmarCambioGrupo(grupo)) return
    const targetGrupoId = grupoMoverDraft[item.id]
    if (!targetGrupoId || targetGrupoId === item.grupoId) {
      toast.error('Selecciona un grupo destino distinto.')
      return
    }
    setGrupoLoading(true)
    try {
      await moverEquipoAGrupo(faseActualFixture.id, item.id, item.equipoId, targetGrupoId)
      setGrupoMoverDraft((prev) => ({ ...prev, [item.id]: '' }))
      toast.success('Equipo movido.')
      refetchGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGrupoLoading(false)
    }
  }

  const ejecutarGenerarFixture = async () => {
    if (!selectedCategoria || !torneoId) {
      toast.error('Selecciona una categoría.')
      return
    }
    const faseObjetivo = requireFaseEspecifica('realizar esta acciÃ³n')
    if (!faseObjetivo) return
    setGenerandoFixture(true)
    try {
      const nEq = await countEquiposEnCategoria(selectedCategoria)
      if (nEq < 2) {
        toast.error('Se necesitan al menos dos equipos en la categoría para generar el fixture.')
        return
      }
      const tipoFase = String(faseObjetivo?.tipo ?? 'todos_contra_todos')

      if (faseObjetivo && isFasePorGrupos(tipoFase)) {
        try {
          await validarGruposAntesDeFixture(faseObjetivo.id)
        } catch (e) {
          const msg = translateUserError(e, 'fixture')
          toast.error(msg)
          if (msg.includes('Primero debes crear los grupos')) setActiveTab('grupos')
          return
        }
        await generarFixtureGruposFase(faseObjetivo.id, false)
        toast.success('Fixture por grupos generado.')
        setFixtureOpen(false)
        invalidatePartidos()
        refetchFixturePorGrupos()
        return
      }

      if (faseObjetivo && tipoFase !== 'todos_contra_todos') {
        toast.error('Este tipo de fase todavía no tiene generación automática de fixture.')
        return
      }

      const nPar = faseObjetivo ? await countPartidosEnFase(faseObjetivo.id) : await countPartidosEnCategoria(selectedCategoria)
      if (nPar > 0) {
        toast.error(faseObjetivo ? 'Esta fase ya tiene fixture generado.' : 'Esta categoría ya tiene partidos en el fixture.')
        return
      }
      if (faseObjetivo && tipoFase === 'todos_contra_todos') {
        const equiposFase = await listFaseEquipos(faseObjetivo.id)
        if (equiposFase.length > 0) {
          await generarFixtureTodosContraTodosFase({
            torneoId,
            categoriaId: selectedCategoria,
            faseTorneoId: faseObjetivo.id,
            equipoIds: equiposFase.map((item) => item.equipo_id),
            idaVuelta: false,
          })
        } else if (faseObjetivo.orden > 1) {
          toast.error('No se puede generar fixture sin equipos asignados a esta fase.')
          return
        } else {
          await generarFixtureCategoria(selectedCategoria)
          await assignPartidosCategoriaSinFase(selectedCategoria, faseObjetivo.id)
        }
      } else {
        await generarFixtureCategoria(selectedCategoria)
        if (faseObjetivo) {
          await assignPartidosCategoriaSinFase(selectedCategoria, faseObjetivo.id)
        }
      }
      toast.success('Fixture generado.')
      setFixtureOpen(false)
      invalidatePartidos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    } finally {
      setGenerandoFixture(false)
    }
  }

  const openEdit = (p: PartidoListaUi) => {
    setEditPartido(p)
    setEditJornada(String(p.jornada ?? ''))
    setEditOrden(String(p.orden ?? 0))
    setEditLocal(p.equipoLocalId ?? '')
    setEditVisit(p.equipoVisitanteId ?? '')
    setEditGrupoId(p.grupoId ?? '')
  }

  const saveEdit = async () => {
    if (!editPartido) return
    if (fixtureEsPorGrupos && !editGrupoId) {
      toast.error('Selecciona un grupo para crear partidos en esta fase.')
      return
    }
    if (!editJornada || Number(editJornada) < 1) {
      toast.error('No puedes crear un partido sin jornada.')
      return
    }
    if (!editLocal || !editVisit || editLocal === editVisit) {
      toast.error('El equipo local y visitante deben ser diferentes.')
      return
    }
    try {
      await updatePartido(editPartido.id, {
        jornada: Number(editJornada) || 0,
        orden: Number(editOrden) || 0,
        equipo_local_id: editLocal,
        equipo_visitante_id: editVisit,
        grupo_id: fixtureEsPorGrupos ? editGrupoId : null,
      })
      toast.success('Partido actualizado')
      setEditPartido(null)
      invalidatePartidos()
      if (fixtureEsPorGrupos) void refetchFixtureGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    }
  }

  const eliminarPartidoFixture = async (partidoId: string) => {
    try {
      try {
        await eliminarPartidoFixtureSeguro(partidoId, false)
      } catch (e) {
        if (!isForceDeleteError(e)) throw e
        const ok = confirm(
          'Este partido tiene información asociada. Si lo eliminas, también se eliminarán su programación, acta, goles, tarjetas y registros relacionados. ¿Deseas continuar?',
        )
        if (!ok) return
        await eliminarPartidoFixtureSeguro(partidoId, true)
      }
      toast.success('Partido eliminado')
      removePartidosFromCache([partidoId])
    } catch {
      toast.error('No se pudo eliminar el partido.')
    }
  }

  const eliminarPartido = async (p: PartidoListaUi) => eliminarPartidoFixture(p.id)

  const eliminarPartidoProgramado = async (p: PartidoListaUi) => {
    const ok = confirm(
      'Este partido ya está programado. Si lo eliminas, también se eliminará su programación y cualquier información asociada. ¿Deseas continuar?',
    )
    if (!ok) return
    try {
      try {
        await eliminarPartidoFixtureSeguro(p.id, false)
      } catch (e) {
        if (!isForceDeleteError(e)) throw e
        const force = confirm(
          'Este partido tiene información asociada. Si continúas, se eliminarán programación, acta, goles, tarjetas y registros relacionados.',
        )
        if (!force) return
        await eliminarPartidoFixtureSeguro(p.id, true)
      }
      toast.success('Partido eliminado')
      removePartidosFromCache([p.id])
    } catch {
      toast.error('No se pudo eliminar el partido.')
    }
  }

  const eliminarFixtureActual = async () => {
    if (!selectedCategoria) {
      toast.error('Selecciona una categoría.')
      return
    }
    const faseId = selectedFaseIdForRpc()
    if (!faseId) {
      toast.error('Selecciona una fase especÃ­fica para realizar esta acciÃ³n.')
      return
    }
    setDeleteFixtureLoading(true)
    const partidoIds = fixtureEsPorGrupos
      ? fixtureGrupos.map((p) => p.partidoId)
      : partidosCategoria.filter((p) => (p.faseTorneoId ?? '') === faseId).map((p) => p.id)
    const exec = (forzar: boolean) =>
      eliminarFixtureFaseSeguro({
        categoriaId: selectedCategoria,
        faseTorneoId: faseId,
        forzar,
      })
    try {
      try {
        await exec(false)
      } catch (e) {
        if (!isForceDeleteError(e)) throw e
        const ok = confirm('Este fixture tiene información asociada. Confirma si deseas eliminarlo.')
        if (!ok) return
        await exec(true)
      }
      toast.success('Fixture eliminado.')
      removePartidosFromCache(partidoIds)
      if (fixtureEsPorGrupos) {
        qc.setQueryData<FixtureGrupoUi[]>(fixtureGruposQueryKey, [])
        void refetchGruposFase()
      }
    } catch {
      toast.error('No se pudo eliminar el fixture.')
    } finally {
      setDeleteFixtureLoading(false)
    }
  }

  const crearManual = async () => {
    if (!torneoId || !selectedCategoria) {
      toast.error('Selecciona una categorÃ­a.')
      return
    }
    const fase = fasesList.find((item) => item.id === manualFaseId) ?? null
    if (!fase) {
      toast.error('Selecciona una fase especÃ­fica.')
      return
    }
    const jornada = Number(nuevoJornada)
    if (!Number.isInteger(jornada) || jornada < 1) {
      toast.error('No puedes crear un partido sin jornada.')
      return
    }
    const esPorGrupos = isFasePorGrupos(fase.tipo)
    if (esPorGrupos && !manualGrupoId) {
      toast.error('Selecciona un grupo para crear partidos en esta fase.')
      return
    }
    if (!nuevoLocal || !nuevoVisit || nuevoLocal === nuevoVisit) {
      toast.error('El equipo local y visitante deben ser diferentes.')
      return
    }
    try {
      await createPartidoManual({
        torneo_id: torneoId,
        categoria_id: selectedCategoria,
        equipo_local_id: nuevoLocal,
        equipo_visitante_id: nuevoVisit,
        jornada,
        fase_torneo_id: manualFaseId || null,
        grupo_id: esPorGrupos ? manualGrupoId : null,
        orden: (() => {
          const n = Number(nuevoOrden)
          return n > 0 ? n : undefined
        })(),
      })
      toast.success('El partido fue creado correctamente.')
      setCreateOpen(false)
      setNuevoLocal('')
      setNuevoVisit('')
      setNuevoJornada('1')
      setNuevoOrden('0')
      setManualFaseId('')
      setManualGrupoId('')
      invalidatePartidos()
      if (esPorGrupos) void refetchFixtureGrupos()
    } catch (e) {
      toast.error(translateUserError(e, 'fixture'))
    }
  }

  const llenarBorradorSorteo = () => {
    if (!torneoId || !sorteoCategoria) return
    const dias = Number(sorteoDias)
    if (Number.isNaN(dias) || dias < 1) {
      toast.error('Indica un número de días válido (1 o más).')
      return
    }
    const canchasActivas = canchas.filter((c) => c.activa !== false)
    if (!canchasActivas.length) {
      toast.error('Configura al menos una cancha activa en Configuración.')
      return
    }
    if (!pendientesSorteo.length) {
      toast.message('No hay partidos pendientes por programar. Primero crea el fixture en Por categoría.')
      return
    }
    try {
      const borrador = generarBorradorSorteo({
        pendientes: pendientesSorteo,
        programados,
        canchas: canchasActivas.map((c) => ({ id: c.id })),
        horarios: horasParaProgramacion.map((h) => ({ hora: h.hora })),
        fechaInicio: sorteoFecha,
        dias,
      })
      setSorteoDrafts(borrador)
      toast.success('Propuesta generada. Revisa y guarda cuando esté listo.')
    } catch (e) {
      console.error('Error generando borrador de sorteo', { categoriaId: sorteoCategoria, fechaInicio: sorteoFecha, dias, error: e })
      const msg = translateUserError(e, 'programacion')
      toast.error(msg.includes('cancha durante ese horario') ? msg : 'No se pudo actualizar la programación.')
    }
  }

  const guardarBorradorSorteo = async () => {
    if (!torneoId || !sorteoCategoria) return
    setGuardandoSorteo(true)
    let guardados = 0
    try {
      const horasActivas = horasParaProgramacion
      const canchasActivas = canchas.filter((c) => c.activa !== false)
      const defaultHora = horasActivas[0] ? formatHoraUi(normalizeHoraDb(horasActivas[0]!.hora)) : '09:00'

      for (const p of pendientesSorteo) {
        const d = sorteoDrafts[p.id]
        const eff = {
          fecha: d?.fecha ?? sorteoFecha,
          canchaId: d?.canchaId ?? canchasActivas[0]?.id ?? '',
          hora: d?.hora ?? defaultHora,
        }
        if (!eff.canchaId || !eff.fecha || !eff.hora) continue
        await upsertProgramacion(p.programacionId ?? null, {
          partido_id: p.id,
          cancha_id: eff.canchaId,
          fecha: eff.fecha,
          hora_inicio: eff.hora,
          hora_fin: d?.horaFin,
        })
        guardados++
      }
      if (!guardados) {
        toast.error('Completa al menos un partido con fecha, cancha y hora antes de guardar.')
        return
      }
      toast.success(`Se guardaron ${guardados} programación${guardados === 1 ? '' : 'es'}.`)
      setSorteoDrafts({})
      invalidatePartidos()
    } catch (e) {
      console.error('Error guardando sorteo de horarios', { categoriaId: sorteoCategoria, drafts: sorteoDrafts, error: e })
      const msg = translateUserError(e, 'programacion')
      toast.error(msg.includes('cancha durante ese horario') ? msg : 'No se pudo programar el partido. Revisa fecha, hora y cancha.')
    } finally {
      setGuardandoSorteo(false)
    }
  }

  const guardarProgramacionManual = async () => {
    if (!progPartido || !progCancha || !progFecha) {
      toast.error('Completa fecha y cancha.')
      return
    }
    const payload = {
        partido_id: progPartido.id,
        cancha_id: progCancha,
        fecha: progFecha,
        hora_inicio: progHora,
        hora_fin: progHoraFin || undefined,
        estado: progEstado,
        observaciones: progObservaciones.trim() || null,
    }
    setGuardandoProgramacion(true)
    try {
      await upsertProgramacion(progPartido.programacionId ?? null, payload)
      toast.success('Programación guardada')
      setProgPartido(null)
      invalidatePartidos()
    } catch (e) {
      console.error('Error guardando programaciÃ³n', { payload, error: e })
      const msg = translateUserError(e, 'programacion')
      toast.error(msg.includes('cancha durante ese horario') ? msg : 'No se pudo programar el partido. Revisa fecha, hora y cancha.')
    } finally {
      setGuardandoProgramacion(false)
    }
  }

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
        <PageHeader title="Partidos / Fixture" description="Programación de partidos" />
        <EmptyState
          icon={Calendar}
          title="Sin torneo activo"
          description="Selecciona un torneo activo para ver el fixture."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partidos / Fixture"
        description="1) Por categoría: emparejamientos y jornadas. 2) Sorteo: fecha, cancha y hora en programaciones. 3) Por fecha: solo lo ya programado."
      />

      <Dialog open={fixtureOpen} onOpenChange={setFixtureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar fixture</DialogTitle>
            <DialogDescription>
              {fixtureEsPorGrupos
                ? 'Se crearán jornadas dentro de cada grupo de la fase seleccionada. La fecha y hora se asignan después en Sorteo de horarios.'
                : 'Se crearán las jornadas y los enfrentamientos en la categoría seleccionada. La fecha y hora de juego se asignan después en Sorteo de horarios.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFixtureOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void ejecutarGenerarFixture()} disabled={generandoFixture}>
              {generandoFixture ? 'Generando…' : fixtureEsPorGrupos ? 'Generar fixture por grupos' : 'Generar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editPartido)} onOpenChange={(o) => !o && setEditPartido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar partido</DialogTitle>
            <DialogDescription>Cambia jornada, orden de partido o equipos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Jornada</Label>
              <Input value={editJornada} onChange={(e) => setEditJornada(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Orden en la jornada</Label>
              <Input value={editOrden} onChange={(e) => setEditOrden(e.target.value)} type="number" />
            </div>
            {fixtureEsPorGrupos && (
              <div className="space-y-1">
                <Label>Grupo</Label>
                <Select
                  value={editGrupoId || '__none__'}
                  onValueChange={(v) => {
                    setEditGrupoId(v === '__none__' ? '' : v)
                    setEditLocal('')
                    setEditVisit('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecciona un grupo</SelectItem>
                    {gruposFase.map((grupo) => (
                      <SelectItem key={grupo.id} value={grupo.id}>
                        {grupo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Local</Label>
              <Select value={editLocal} onValueChange={setEditLocal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equiposEdit.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}{e.sigla ? ` (${e.sigla})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visitante</Label>
              <Select value={editVisit} onValueChange={setEditVisit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {equiposEdit.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}{e.sigla ? ` (${e.sigla})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPartido(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveEdit()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo partido manual</DialogTitle>
            <DialogDescription>En la categoría seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Local</Label>
              <Select value={nuevoLocal} onValueChange={setNuevoLocal}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipo local" />
                </SelectTrigger>
                <SelectContent>
                  {equiposManual.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}{e.sigla ? ` (${e.sigla})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Visitante</Label>
              <Select value={nuevoVisit} onValueChange={setNuevoVisit}>
                <SelectTrigger>
                  <SelectValue placeholder="Equipo visitante" />
                </SelectTrigger>
                <SelectContent>
                  {equiposManual.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}{e.sigla ? ` (${e.sigla})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Jornada</Label>
              <Input value={nuevoJornada} onChange={(e) => setNuevoJornada(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Orden (opcional, 0 = automático)</Label>
              <Input value={nuevoOrden} onChange={(e) => setNuevoOrden(e.target.value)} type="number" />
            </div>
            <div className="space-y-1">
              <Label>Fase del torneo</Label>
              <Select
                value={manualFaseId || '__none__'}
                onValueChange={(v) => {
                  setManualFaseId(v === '__none__' ? '' : v)
                  setManualGrupoId('')
                  setNuevoLocal('')
                  setNuevoVisit('')
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecciona una fase</SelectItem>
                  {fasesList.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {manualEsPorGrupos && (
              <div className="space-y-1">
                <Label>Grupo</Label>
                <Select
                  value={manualGrupoId || '__none__'}
                  onValueChange={(v) => {
                    setManualGrupoId(v === '__none__' ? '' : v)
                    setNuevoLocal('')
                    setNuevoVisit('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecciona un grupo</SelectItem>
                    {gruposFase.map((grupo) => (
                      <SelectItem key={grupo.id} value={grupo.id}>
                        {grupo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!manualGrupoId && (
                  <p className="text-xs text-muted-foreground">En fases por grupos, el partido debe pertenecer a un grupo.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void crearManual()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createJornadaOpen} onOpenChange={setCreateJornadaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear jornada</DialogTitle>
            <DialogDescription>
              La jornada se crea al agregar su primer partido. No se asignan fecha, hora ni cancha desde el fixture.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Número de jornada</Label>
            <Input value={jornadaDraft} onChange={(e) => setJornadaDraft(e.target.value)} type="number" min={1} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateJornadaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmarCrearJornada}>
              Agregar partido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteJornada)} onOpenChange={(open) => !open && setDeleteJornada(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Eliminar jornada {deleteJornada?.jornada}
              {deleteJornada?.grupoNombre ? ` · ${deleteJornada.grupoNombre}` : ''}
            </DialogTitle>
            <DialogDescription>
              Esta acción eliminará todos los partidos de la jornada seleccionada. Si existen programaciones o actas asociadas,
              también podrían verse afectadas. ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          {deleteJornada && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Si Supabase detecta información asociada, se pedirá una confirmación adicional antes de forzar la eliminación.
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteJornada(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmarDeleteJornada()}
              disabled={deleteJornadaLoading}
            >
              Eliminar jornada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editJornadaOpen} onOpenChange={setEditJornadaOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar jornada</DialogTitle>
            <DialogDescription>Cambia el número de jornada y el orden de los partidos incluidos.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
            {editJornadaRows.map((row, idx) => (
              <div key={row.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr_7rem_7rem] md:items-end">
                <div>
                  <Label>Partido</Label>
                  <p className="mt-2 text-sm font-medium">{row.label}</p>
                </div>
                <div className="space-y-1">
                  <Label>Jornada</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.jornada}
                    onChange={(e) =>
                      setEditJornadaRows((prev) =>
                        prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, jornada: e.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    min={1}
                    value={row.orden}
                    onChange={(e) =>
                      setEditJornadaRows((prev) =>
                        prev.map((item, itemIdx) => (itemIdx === idx ? { ...item, orden: e.target.value } : item)),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditJornadaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveEditJornada()}>
              Guardar jornada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(progPartido)} onOpenChange={(o) => !o && setProgPartido(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{progPartido?.programacionId ? 'Editar programación' : 'Programar partido'}</DialogTitle>
            <DialogDescription>
              Modifica fecha, horas, cancha, estado u observaciones. Se evita duplicar la misma cancha y hora de inicio.
            </DialogDescription>
          </DialogHeader>
          {progPartido && (
            <div className="grid gap-3 py-2">
              <p className="text-sm text-muted-foreground">
                {progPartido.equipoLocalNombre} vs {progPartido.equipoVisitanteNombre}
              </p>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={progFecha} onChange={(e) => setProgFecha(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Hora inicio</Label>
                  <Input type="time" value={progHora} onChange={(e) => setProgHora(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Hora fin</Label>
                  <Input type="time" value={progHoraFin} onChange={(e) => setProgHoraFin(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Cancha</Label>
                <Select value={progCancha} onValueChange={setProgCancha}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cancha" />
                  </SelectTrigger>
                  <SelectContent>
                    {canchas.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={progEstado} onValueChange={setProgEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programado">Programado</SelectItem>
                    <SelectItem value="jugado">Jugado</SelectItem>
                    <SelectItem value="suspendido">Suspendido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                    <SelectItem value="reprogramado">Reprogramado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Observaciones</Label>
                <Textarea rows={2} value={progObservaciones} onChange={(e) => setProgObservaciones(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgPartido(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void guardarProgramacionManual()} disabled={guardandoProgramacion}>
              {guardandoProgramacion ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:inline-flex lg:w-auto">
          <TabsTrigger value="categoria">Por Categoría</TabsTrigger>
          <TabsTrigger value="sorteo">Sorteo de Horarios</TabsTrigger>
          <TabsTrigger value="fecha">Por Fecha</TabsTrigger>
          <TabsTrigger value="grupos">Grupos</TabsTrigger>
          <TabsTrigger value="fases" className="gap-1">
            <Layers className="h-4 w-4" />
            Fases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categoria" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              {catLoading ? (
                <Skeleton className="h-10 w-64" />
              ) : categorias.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="Sin categorías"
                  description="Crea categorías antes de organizar el fixture."
                />
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.nombre}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedFixtureFase || '__all__'} onValueChange={(v) => setSelectedFixtureFase(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-full md:w-56">
                      <SelectValue placeholder="Fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas las fases</SelectItem>
                      {fasesList.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (requireFaseEspecifica('realizar esta acciÃ³n')) setFixtureOpen(true)
                    }}
                  >
                    {fixtureEsPorGrupos ? 'Generar fixture por grupos' : 'Generar fixture'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void eliminarFixtureActual()}
                    disabled={!selectedCategoria || !faseActualFixture || deleteFixtureLoading}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Eliminar fixture
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={openCrearJornada} disabled={!selectedCategoria}>
                    <Plus className="mr-1 h-4 w-4" />
                    Crear jornada
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!requireFaseEspecifica('crear partidos')) return
                      setManualFaseId(selectedFixtureFase)
                      setManualGrupoId('')
                      setNuevoLocal('')
                      setNuevoVisit('')
                      setCreateOpen(true)
                    }}
                    disabled={!selectedCategoria}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Crear partido
                  </Button>
                </div>
              )}
              {fixtureEsPorGrupos && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Esta fase genera fixture todos contra todos dentro de cada grupo. Si faltan grupos o equipos asignados,
                  usa la pestaña Grupos antes de generar.
                </p>
              )}
            </CardContent>
          </Card>

          {parLoading || (fixtureEsPorGrupos && gruposLoading) ? (
            <Skeleton className="h-64 w-full" />
          ) : fixtureEsPorGrupos ? (
            fixtureGruposPorGrupo.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title={gruposConEquiposAsignados ? 'Esta fase todavía no tiene fixture generado' : 'Sin grupos listos para fixture'}
                description={
                  gruposConEquiposAsignados
                    ? 'Genera el fixture por grupos para ver las jornadas.'
                    : 'Primero crea los grupos y asigna equipos a esta fase.'
                }
                action={
                  gruposConEquiposAsignados ? (
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => {
                        if (requireFaseEspecifica('realizar esta acciÃ³n')) setFixtureOpen(true)
                      }}
                    >
                      Generar fixture por grupos
                    </Button>
                  ) : (
                    <Button type="button" variant="default" onClick={() => setActiveTab('grupos')}>
                      Ir a Grupos
                    </Button>
                  )
                }
              />
            ) : (
              fixtureGruposPorGrupo.map((grupo) => {
                const jornadasGrupo = [...new Set(grupo.partidos.map((p) => p.jornada))].sort((a, b) => a - b)
                return (
                  <Card key={grupo.key}>
                    <CardHeader>
                      <CardTitle className="text-lg">{grupo.nombre}</CardTitle>
                      <CardDescription>{grupo.partidos.length} partidos</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {jornadasGrupo.map((jornada) => {
                        const partidosJornada = grupo.partidos.filter((p) => p.jornada === jornada)
                        return (
                          <div key={`${grupo.key}-${jornada}`} className="rounded-md border p-3">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <h3 className="text-sm font-semibold">Jornada {jornada}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{partidosJornada.length} partidos</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openCrearPartidoEnJornada(jornada, grupo.grupoId)}
                                  disabled={!grupo.grupoId}
                                >
                                  <Plus className="mr-1 h-4 w-4" />
                                  Agregar partido
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => openDeleteJornada(jornada, grupo.grupoId, grupo.nombre)}
                                  disabled={deleteJornadaLoading}
                                >
                                  <Trash2 className="mr-1 h-4 w-4" />
                                  Eliminar jornada
                                </Button>
                              </div>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                              {partidosJornada.map((partido) => {
                                const partidoFixture = partidosCategoria.find((item) => item.id === partido.partidoId)
                                const jugado = isJugadoEstado(partido.estado)
                                const programado = Boolean(partido.fecha || partido.hora || partido.cancha) && !jugado
                                return (
                                  <div key={partido.partidoId} className="rounded-md border bg-card p-4">
                                    <p className="mb-3 text-xs text-muted-foreground">Orden {partido.orden ?? 0}</p>
                                    <div className="mb-3 flex items-center justify-between gap-3 text-sm font-medium">
                                      <span className="min-w-0 flex-1 truncate">{partido.equipoLocalNombre}</span>
                                      <span className="shrink-0 text-muted-foreground">
                                        {partidoFixture ? (
                                          <ResultadoPartido partido={partidoFixture} played={jugado} />
                                        ) : jugado && partido.golesLocal != null && partido.golesVisitante != null ? (
                                          <span className="font-bold tabular-nums text-foreground">
                                            {partido.golesLocal} - {partido.golesVisitante}
                                          </span>
                                        ) : (
                                          'vs'
                                        )}
                                      </span>
                                      <span className="min-w-0 flex-1 truncate text-right">{partido.equipoVisitanteNombre}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                                      {jugado ? (
                                        <Badge>Jugado</Badge>
                                      ) : programado ? (
                                        <Badge variant="secondary">Programado</Badge>
                                      ) : (
                                        <Badge variant="outline">Pendiente de programar</Badge>
                                      )}
                                    </div>
                                    {partido.fecha || partido.hora || partido.cancha ? (
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        {partido.fecha ? formatDate(partido.fecha) : ''}
                                        {partido.hora ? ` · ${partido.hora}` : ''}
                                        {partido.cancha ? ` · ${partido.cancha}` : ''}
                                      </p>
                                    ) : null}
                                    <div className="mt-3 flex justify-end gap-2">
                                      {partidoFixture && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openEdit(partidoFixture)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => void eliminarPartidoFixture(partido.partidoId)}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                )
              })
            )
          ) : partidosCategoria.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sin partidos en esta categoría"
              description="Genera el fixture (todos contra todos) o crea partidos manualmente."
              action={
                <Button
                  type="button"
                  variant="default"
                  onClick={() => {
                    if (requireFaseEspecifica('realizar esta acciÃ³n')) setFixtureOpen(true)
                  }}
                >
                  Generar fixture
                </Button>
              }
            />
          ) : (
            jornadas.map((jornada) => {
              const partidosJornada = partidosCategoria.filter((p) => p.jornada === jornada)
              return (
                <Card key={jornada}>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">Jornada {jornada}</CardTitle>
                      <CardDescription>{partidosJornada.length} partidos — solo emparejamientos</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => openCrearPartidoEnJornada(jornada)}>
                        <Plus className="mr-1 h-4 w-4" />
                        Agregar partido
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => openEditJornada(jornada, partidosJornada)}>
                        <Edit className="mr-1 h-4 w-4" />
                        Editar jornada
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => void openDeleteJornada(jornada)}
                        disabled={deleteJornadaLoading}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Eliminar jornada
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {partidosJornada.map((partido) => {
                        const colLocal = partido.categoriaColor || '#64748b'
                        const colVis = '#64748b'

                        return (
                          <div key={partido.id} className="overflow-hidden rounded-md border bg-card">
                            <div className="p-4">
                              <p className="mb-3 text-xs text-muted-foreground">Orden {partido.orden ?? 0}</p>

                              <div className="mb-3 flex items-center justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <TeamAvatar
                                    nombre={partido.equipoLocalNombre}
                                    color={colLocal}
                                    logoUrl={partido.equipoLocalLogoUrl}
                                    logoPublicId={partido.equipoLocalLogoPublicId}
                                  />
                                  <span className="truncate text-sm font-medium">{partido.equipoLocalNombre}</span>
                                </div>

                                <div className="mx-1 shrink-0">
                                  <ResultadoPartido partido={partido} played={isJugadoEstado(partido.estado)} />
                                </div>

                                <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                                  <span className="truncate text-sm font-medium">{partido.equipoVisitanteNombre}</span>
                                  <TeamAvatar
                                    nombre={partido.equipoVisitanteNombre}
                                    color={colVis}
                                    logoUrl={partido.equipoVisitanteLogoUrl}
                                    logoPublicId={partido.equipoVisitanteLogoPublicId}
                                  />
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                                {(() => {
                                  const jugado = isJugadoEstado(partido.estado)
                                  const programado = Boolean(partido.programacionId) && !jugado
                                  return (
                                    <>
                                      {jugado ? (
                                        <Badge>Jugado</Badge>
                                      ) : programado ? (
                                        <Badge variant="secondary">Programado</Badge>
                                      ) : (
                                        <Badge variant="outline">Pendiente de programar</Badge>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>
                              {(partido.programacionId && (partido.fecha || partido.hora || partido.cancha)) ? (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {partido.fecha ? formatDate(partido.fecha) : ''}
                                  {partido.hora ? ` · ${partido.hora}` : ''}
                                  {partido.cancha ? ` · ${partido.cancha}` : ''}
                                </p>
                              ) : null}
                              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openProgramacion(partido)}
                                >
                                  {partido.programacionId ? 'Editar programación' : 'Programar'}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(partido)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => void eliminarPartido(partido)}>
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                                {onOpenActa && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onOpenActa(partido.id, partido.categoriaId)}
                                  >
                                    Acta
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="sorteo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sorteo de Horarios</CardTitle>
              <CardDescription>
                Asigna fecha, cancha y hora a los partidos del fixture que aún no tienen programación. Elige la categoría,
                genera una propuesta al azar, ajusta manualmente y guarda cuando esté listo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <Select
                    value={sorteoCategoria}
                    onValueChange={(v) => {
                      setSorteoCategoria(v)
                      setSelectedCategoria(v)
                    }}
                  >
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Primera fecha</Label>
                  <Input type="date" value={sorteoFecha} onChange={(e) => setSorteoFecha(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Días a explorar</Label>
                  <Input value={sorteoDias} onChange={(e) => setSorteoDias(e.target.value)} className="w-24" />
                </div>
                <Button type="button" disabled={pendientesSorteo.length === 0} onClick={() => llenarBorradorSorteo()}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Asignar al azar
                </Button>
                <Button
                  type="button"
                  variant="default"
                  disabled={guardandoSorteo || pendientesSorteo.length === 0}
                  onClick={() => void guardarBorradorSorteo()}
                >
                  {guardandoSorteo ? 'Guardando…' : 'Guardar programación'}
                </Button>
              </div>

              {pendientesSorteo.length > 0 ? (
                <div className="space-y-4">
                  {sorteoAgrupado.map((grupo) => (
                    <div key={grupo.key} className="space-y-3">
                      {grupo.nombre && <h3 className="text-base font-semibold">{grupo.nombre}</h3>}
                      {grupo.jornadas.map(({ jornada, partidos }) => (
                        <Card key={`${grupo.key}-${jornada}`}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-sm">Jornada {jornada || 'sin jornada'}</CardTitle>
                            <CardDescription>{partidos.length} partidos pendientes por programar</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {partidos.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No hay partidos pendientes por programar en esta jornada.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Partido</TableHead>
                                    <TableHead>Jornada</TableHead>
                                    {grupo.nombre && <TableHead>Grupo</TableHead>}
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {partidos.map((partido) => {
                                    const canchasActivas = canchas.filter((c) => c.activa !== false)
                                    const d = sorteoDrafts[partido.id]
                                    const defaultHora = horasParaProgramacion[0]
                                      ? formatHoraUi(normalizeHoraDb(horasParaProgramacion[0]!.hora))
                                      : '09:00'
                                    const eff: SorteoBorradorSlot = {
                                      fecha: d?.fecha ?? sorteoFecha,
                                      canchaId: d?.canchaId ?? canchasActivas[0]?.id ?? '',
                                      hora: d?.hora ?? defaultHora,
                                      horaFin: d?.horaFin,
                                    }
                                    return (
                                      <TableRow key={partido.id}>
                                        <TableCell>
                                          {partido.equipoLocalNombre} vs {partido.equipoVisitanteNombre}
                                        </TableCell>
                                        <TableCell>Jornada {partido.jornada || jornada || 'sin jornada'}</TableCell>
                                        {grupo.nombre && <TableCell>{grupo.nombre}</TableCell>}
                                        <TableCell>
                                          <Badge variant="outline">Pendiente de programar</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openProgramacion(partido, eff)}
                                          >
                                            Programar
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
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No hay partidos pendientes por programar"
                  description="Primero crea el fixture en Por categoría."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grupos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grupos por fase</CardTitle>
              <CardDescription>
                Administra grupos, cuadrangulares y equipos antes de generar el fixture por grupo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Categoría</Label>
                  <Select value={selectedCategoria} onValueChange={setSelectedCategoria}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Fase</Label>
                  <Select value={faseActualFixture?.id ?? '__none__'} onValueChange={(v) => setSelectedFixtureFase(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecciona una fase</SelectItem>
                      {fasesList.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Cantidad de grupos</Label>
                  <Input type="number" min={1} value={grupoCantidad} onChange={(e) => setGrupoCantidad(e.target.value)} />
                </div>
              </div>

              {!faseActualFixture ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  Selecciona una fase para administrar sus grupos.
                </div>
              ) : !fixtureEsPorGrupos ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  Esta fase no se juega por grupos.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
                    <div className="space-y-1">
                      <Label>Asignación de equipos</Label>
                      <Select value={grupoAsignacion} onValueChange={setGrupoAsignacion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aleatoria">Aleatoria</SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" disabled={grupoLoading} onClick={() => void handleCrearGrupos()}>
                      Crear grupos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={grupoLoading || grupoAsignacion !== 'aleatoria'}
                      onClick={() => void handleRepartirEquipos()}
                    >
                      Repartir equipos
                    </Button>
                  </div>

                  {gruposLoading ? (
                    <Skeleton className="h-40 w-full" />
                  ) : gruposFase.length === 0 ? (
                    <EmptyState
                      icon={Layers}
                      title="Sin grupos"
                      description="Primero debes crear los grupos de esta fase."
                      action={
                        <Button type="button" onClick={() => void handleCrearGrupos()}>
                          Crear grupos
                        </Button>
                      }
                    />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {gruposFase.map((grupo) => {
                        const equiposGrupo = grupoEquiposPorGrupo.get(grupo.id) ?? []
                        return (
                          <Card key={grupo.id}>
                            <CardHeader className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <CardTitle className="text-lg">{grupo.nombre}</CardTitle>
                                  <CardDescription>
                                    {equiposGrupo.length} equipos
                                    {grupo.partidosJugados > 0 ? ` · ${grupo.partidosJugados} partidos jugados` : ''}
                                  </CardDescription>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  disabled={grupoLoading}
                                  onClick={() => void handleEliminarGrupo(grupo)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  value={grupoNombresDraft[grupo.id] ?? grupo.nombre}
                                  onChange={(e) => setGrupoNombresDraft((prev) => ({ ...prev, [grupo.id]: e.target.value }))}
                                />
                                <Button type="button" variant="outline" disabled={grupoLoading} onClick={() => void handleRenombrarGrupo(grupo)}>
                                  Guardar
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2">
                                {equiposGrupo.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">Grupo vacío.</p>
                                ) : (
                                  equiposGrupo.map((item) => (
                                    <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                                      <TeamAvatar
                                        nombre={item.equipoNombre}
                                        color={item.equipoColor ?? '#64748b'}
                                        logoUrl={item.logoUrl}
                                        logoPublicId={item.logoPublicId}
                                      />
                                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        {item.equipoNombre}
                                        {item.sigla ? <span className="ml-2 text-xs font-normal text-muted-foreground">{item.sigla}</span> : null}
                                      </span>
                                      <Select
                                        value={grupoMoverDraft[item.id] || '__none__'}
                                        onValueChange={(v) => setGrupoMoverDraft((prev) => ({ ...prev, [item.id]: v === '__none__' ? '' : v }))}
                                      >
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="Mover a" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">Mover a...</SelectItem>
                                          {gruposFase
                                            .filter((g) => g.id !== item.grupoId)
                                            .map((g) => (
                                              <SelectItem key={g.id} value={g.id}>
                                                {g.nombre}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                      <Button type="button" variant="outline" size="sm" disabled={grupoLoading} onClick={() => void handleMoverEquipoGrupo(grupo, item)}>
                                        Mover
                                      </Button>
                                      <Button type="button" variant="ghost" size="sm" disabled={grupoLoading} onClick={() => void handleQuitarEquipoGrupo(grupo, item)}>
                                        Quitar
                                      </Button>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                                <div className="min-w-56 flex-1 space-y-1">
                                  <Label>Agregar equipo</Label>
                                  <Select
                                    value={grupoEquipoDraft[grupo.id] || '__none__'}
                                    onValueChange={(v) => setGrupoEquipoDraft((prev) => ({ ...prev, [grupo.id]: v === '__none__' ? '' : v }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Equipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="__none__">Selecciona equipo</SelectItem>
                                      {equiposDisponiblesParaGrupo.map((equipo) => (
                                        <SelectItem key={equipo.id} value={equipo.id}>
                                          {equipo.nombre}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button type="button" disabled={grupoLoading} onClick={() => void handleAgregarEquipoGrupo(grupo)}>
                                  Agregar
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={grupoLoading}
                                  onClick={() => void handleAgregarRestantesGrupo(grupo)}
                                >
                                  Agregar equipos restantes
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fases" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Fases del torneo</CardTitle>
                <CardDescription>
                  Usa la categoría elegida en «Por categoría». La fase activa orienta el fixture; los partidos manuales
                  pueden asociarse a una fase.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {siguienteFaseQ.data?.ok && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      resetFaseForm()
                      setFaseOrigenId(siguienteFaseQ.data?.faseActual?.id ?? '')
                      setSiguienteFaseOpen(true)
                    }}
                  >
                    Crear siguiente fase
                  </Button>
                )}
                <Button type="button" size="sm" disabled={!selectedCategoria} onClick={() => setFaseDialogOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Nueva fase
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCategoria ? (
                <p className="text-sm text-muted-foreground">Selecciona una categoría en la pestaña «Por categoría».</p>
              ) : fasesList.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="Sin fases"
                  description="Crea la primera fase eligiendo nombre y tipo (nada se crea automáticamente)."
                  action={
                    <Button type="button" onClick={() => setFaseDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear fase
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Reinicia tabla</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fasesList.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          {f.nombre}
                          {f.descripcion && (
                            <p className="text-xs font-normal text-muted-foreground">{f.descripcion}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {tiposFaseOptions().find((t) => t.value === f.tipo)?.label ?? f.tipo}
                        </TableCell>
                        <TableCell>{f.reinicia_tabla ? 'Sí' : 'No (acumula)'}</TableCell>
                        <TableCell>
                          {f.activa ? <Badge>Activa</Badge> : <Badge variant="outline">Inactiva</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                          {!f.activa && (
                            <Button type="button" size="sm" variant="outline" onClick={() => void handleActivarFase(f.id)}>
                              Marcar activa
                            </Button>
                          )}
                          {f.activa && (
                            <Button type="button" size="sm" variant="outline" onClick={() => void archivarFase(f)}>
                              Archivar
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={faseDeleting}
                            onClick={() => void openDeleteFase(f)}
                          >
                            Eliminar fase
                          </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {siguienteFaseQ.data && !siguienteFaseQ.data.ok && siguienteFaseQ.data.motivo && fasesList.length > 0 && (
                <p className="mt-3 text-sm text-muted-foreground">{siguienteFaseQ.data.motivo}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fecha" className="space-y-4">
          {fechasOrdenadas.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="Sin partidos programados"
              description="Aún no hay partidos programados. Primero crea el fixture y luego asigna horarios."
            />
          ) : (
            fechasOrdenadas.map((fecha) => {
              const partidosFecha = partidosPorFecha[fecha] ?? []
              const partidosFechaOrdenados = [...partidosFecha].sort(comparePartidosPorHora)
              const conflicts = findConflictIdsForFecha(partidosFechaOrdenados)
              const hasConflicts = conflicts.length > 0

              return (
                <Card key={fecha}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {fecha === 'sin-fecha' ? 'Sin fecha' : formatDateOnly(fecha)}
                          {hasConflicts && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Conflicto
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{partidosFecha.length} partidos programados</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Hora</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Local</TableHead>
                          <TableHead className="text-center">Resultado</TableHead>
                          <TableHead>Visitante</TableHead>
                          <TableHead>Cancha</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partidosFechaOrdenados.map((partido) => {
                            const played =
                              isJugadoEstado(partido.estado) ||
                              partido.definicion === 'walkover' ||
                              partido.definicion === 'suspendido'
                            const isConflict = conflicts.includes(partido.id)

                            return (
                              <TableRow key={partido.id} className={isConflict ? 'bg-destructive/5' : ''}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    {isConflict && <AlertTriangle className="h-4 w-4 text-destructive" />}
                                    {partido.hora || '—'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    style={{ borderColor: partido.categoriaColor, color: partido.categoriaColor }}
                                  >
                                    {partido.categoriaNombre}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <TeamAvatar
                                      nombre={partido.equipoLocalNombre}
                                      color={partido.categoriaColor}
                                      logoUrl={partido.equipoLocalLogoUrl}
                                      logoPublicId={partido.equipoLocalLogoPublicId}
                                    />
                                    {partido.equipoLocalNombre}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  {partido.definicion === 'suspendido' ? (
                                    <span className="font-semibold text-warning">Suspendido</span>
                                  ) : played ? (
                                    <>
                                    <span className="font-bold">
                                      {partido.golesLocal ?? '—'} - {partido.golesVisitante ?? '—'}
                                    </span>
                                    {partido.definicion === 'walkover' || partido.resultadoNota ? (
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {partido.resultadoNota || 'Ganador por W'}
                                      </p>
                                    ) : null}
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground">vs</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <TeamAvatar
                                      nombre={partido.equipoVisitanteNombre}
                                      color="#64748b"
                                      logoUrl={partido.equipoVisitanteLogoUrl}
                                      logoPublicId={partido.equipoVisitanteLogoPublicId}
                                    />
                                    {partido.equipoVisitanteNombre}
                                  </div>
                                </TableCell>
                                <TableCell className={isConflict ? 'font-medium text-destructive' : ''}>
                                  {partido.cancha || '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={played ? 'default' : 'secondary'}>
                                    {played ? 'Jugado' : partido.estado || 'Programado'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => openProgramacion(partido)}>
                                      Editar programación
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => void eliminarPartidoProgramado(partido)}
                                    >
                                      Eliminar partido
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={faseDialogOpen} onOpenChange={setFaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva fase</DialogTitle>
            <DialogDescription>En la categoría actualmente seleccionada en «Por categoría».</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={faseNombre} onChange={(e) => setFaseNombre(e.target.value)} placeholder="Ej: Eliminatoria" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de fase</Label>
              <Select value={faseTipo || undefined} onValueChange={setFaseTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposFaseOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Reinicia tabla de posiciones</p>
                <p className="text-xs text-muted-foreground">Si está activo, las estadísticas de esta fase arrancan en cero.</p>
              </div>
              <Switch checked={faseReinicia} onCheckedChange={(v) => setFaseReinicia(v === true)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaseDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleCrearFase()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteFaseTarget)} onOpenChange={(open) => !open && setDeleteFaseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar fase</DialogTitle>
            <DialogDescription>
              Esta acción solo afecta la fase seleccionada y sus partidos asociados dentro de esta categoría.
            </DialogDescription>
          </DialogHeader>
          {deleteFaseTarget && (
            <div className="space-y-3 py-2 text-sm">
              <p className="font-medium">{deleteFaseTarget.fase.nombre}</p>
              <p>Partidos asociados: {deleteFaseTarget.summary.partidos}</p>
              {deleteFaseTarget.summary.tieneInformacionAsociada && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                  Esta fase tiene información asociada: {deleteFaseTarget.summary.jugados} jugados,{' '}
                  {deleteFaseTarget.summary.programaciones} programaciones, {deleteFaseTarget.summary.actas} actas,{' '}
                  {deleteFaseTarget.summary.goles} goles y {deleteFaseTarget.summary.tarjetas} tarjetas.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteFaseTarget(null)}>
              Cancelar
            </Button>
            {deleteFaseTarget && (
              <Button type="button" variant="secondary" onClick={() => void archivarFase(deleteFaseTarget.fase)}>
                Archivar fase
              </Button>
            )}
            <Button type="button" variant="destructive" disabled={faseDeleting} onClick={() => void confirmarDeleteFase()}>
              Eliminar fase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={siguienteFaseOpen} onOpenChange={setSiguienteFaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear siguiente fase</DialogTitle>
            <DialogDescription>
              Fase actual completada: {siguienteFaseQ.data?.faseActual?.nombre}. La nueva fase quedará activa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={faseNombre} onChange={(e) => setFaseNombre(e.target.value)} placeholder="Ej: Fase 2" />
            </div>
            <div className="space-y-1">
              <Label>Tipo de fase</Label>
              <Select value={faseTipo || undefined} onValueChange={setFaseTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposFaseOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fase anterior de referencia</Label>
              <Select
                value={faseOrigenId || siguienteFaseQ.data?.faseActual?.id || undefined}
                onValueChange={setFaseOrigenId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige la fase anterior" />
                </SelectTrigger>
                <SelectContent>
                  {fasesList.map((fase) => (
                    <SelectItem key={fase.id} value={fase.id}>
                      {fase.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Reinicia tabla</p>
                <p className="text-xs text-muted-foreground">
                  Sí: esta fase arranca en cero. No: acumula con fases anteriores según el orden.
                </p>
              </div>
              <Switch checked={faseReinicia} onCheckedChange={(v) => setFaseReinicia(v === true)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Equipos clasificados</Label>
                <Select value={clasificadosModo} onValueChange={setClasificadosModo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Selección manual</SelectItem>
                    <SelectItem value="clasificacion">Desde clasificación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Criterio sugerido</Label>
                <Select value={clasificadosCriterio} onValueChange={setClasificadosCriterio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primeros">Primeros de cada grupo</SelectItem>
                    <SelectItem value="primeros_y_segundos">Primeros y segundos</SelectItem>
                    <SelectItem value="mejores_terceros">Mejores terceros</SelectItem>
                    <SelectItem value="tabla_general">Orden por tabla general</SelectItem>
                    <SelectItem value="cruces_manual">Cruces manuales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fuente de equipos para esta fase</Label>
              <Select value={clasificadosModo} onValueChange={setClasificadosModo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los equipos</SelectItem>
                  <SelectItem value="manual">Selección manual</SelectItem>
                  <SelectItem value="clasificacion">Desde clasificación anterior</SelectItem>
                  <SelectItem value="sin_equipos">Partidos sin equipos todavía</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Total clasificados</Label>
                <Input
                  type="number"
                  min="0"
                  value={faseClasificadosTotal}
                  onChange={(e) => setFaseClasificadosTotal(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Clasificados por grupo</Label>
                <Input
                  type="number"
                  min="0"
                  value={faseClasificadosPorGrupo}
                  onChange={(e) => setFaseClasificadosPorGrupo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Cuadrangulares/grupos</Label>
                <Input
                  type="number"
                  min="1"
                  value={faseCuadrangularesCantidad}
                  onChange={(e) => setFaseCuadrangularesCantidad(e.target.value)}
                />
              </div>
            </div>
            {faseTipo === 'eliminatoria_directa' && (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Modalidad</Label>
                  <Select value={faseModalidad} onValueChange={setFaseModalidad}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solo_ida">Solo ida</SelectItem>
                      <SelectItem value="ida_vuelta">Ida y vuelta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Cruces</Label>
                  <Select value={faseCruces} onValueChange={setFaseCruces}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primero_vs_ultimo">Primero vs último</SelectItem>
                      <SelectItem value="serpiente">Orden serpiente</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="sin_equipos">Sin equipos todavía</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Tercer puesto</p>
                    <p className="text-xs text-muted-foreground">No es tipo de fase.</p>
                  </div>
                  <Switch checked={faseTercerPuesto} onCheckedChange={(v) => setFaseTercerPuesto(v === true)} />
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              La selección y los cruces quedan preparados en la UI; guardar clasificados requiere persistencia adicional.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiguienteFaseOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleCrearFase(true)}>
              Crear siguiente fase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
