import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { crearTorneoVacio, getTorneoById, getTorneos } from '@/features/torneos/torneosService'
import type { TorneoActivo } from '@/types/torneo'
import type { TorneoRow } from '@/types/database'

const STORAGE_KEY = 'torneo_activo_id'

export const torneoActivoQueryKey = ['torneo-activo'] as const
export const torneosListQueryKey = ['torneos'] as const

function mapActivo(row: TorneoRow): TorneoActivo {
  return {
    id: row.id,
    nombre: row.nombre,
    organizacion: row.organizacion,
    logo_url: row.logo_url,
    logo_public_id: row.logo_public_id ?? null,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    descripcion: row.descripcion,
  }
}

type TorneoContextValue = {
  data: TorneoActivo | null
  torneos: TorneoRow[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
  selectedTorneoId: string | null
  setTorneoId: (id: string) => void
  crearTorneo: (input: Parameters<typeof crearTorneoVacio>[0]) => Promise<string>
  isCreatingTorneo: boolean
}

const TorneoContext = createContext<TorneoContextValue | null>(null)

export function TorneoProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  )

  const listQ = useQuery({
    queryKey: torneosListQueryKey,
    queryFn: getTorneos,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (listQ.isLoading || !listQ.data) return
    const list = listQ.data
    if (list.length === 0) {
      if (selectedId) {
        setSelectedId(null)
        if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY)
      }
      return
    }
    const valid = selectedId && list.some((t: TorneoRow) => t.id === selectedId)
    if (!valid) {
      const first = list[0]!.id
      setSelectedId(first)
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, first)
    }
  }, [listQ.data, listQ.isLoading, selectedId])

  const detailQ = useQuery({
    queryKey: [...torneoActivoQueryKey, selectedId] as const,
    queryFn: async () => {
      if (!selectedId) return null
      const row = await getTorneoById(selectedId)
      return row ? mapActivo(row) : null
    },
    enabled: Boolean(selectedId),
    staleTime: 30_000,
  })

  const setTorneoId = useCallback(
    (id: string) => {
      setSelectedId(id)
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
      void qc.invalidateQueries({ queryKey: torneoActivoQueryKey })
    },
    [qc],
  )

  const crearMut = useMutation({
    mutationFn: crearTorneoVacio,
    onSuccess: (newId: string) => {
      setTorneoId(newId)
      void qc.invalidateQueries({ queryKey: torneosListQueryKey })
      void qc.invalidateQueries({ queryKey: torneoActivoQueryKey })
    },
  })

  const value = useMemo((): TorneoContextValue => {
    return {
      data: detailQ.data ?? null,
      torneos: listQ.data ?? [],
      isLoading: listQ.isLoading || (!!selectedId && detailQ.isLoading),
      error: (listQ.error as Error | null) ?? (detailQ.error as Error | null) ?? null,
      refetch: () => {
        void listQ.refetch()
        void detailQ.refetch()
      },
      selectedTorneoId: selectedId,
      setTorneoId,
      crearTorneo: (input) => crearMut.mutateAsync(input),
      isCreatingTorneo: crearMut.isPending,
    }
  }, [detailQ, listQ, selectedId, setTorneoId, crearMut])

  return <TorneoContext.Provider value={value}>{children}</TorneoContext.Provider>
}

export function useTorneoActivo() {
  const ctx = useContext(TorneoContext)
  if (!ctx) {
    throw new Error('useTorneoActivo debe usarse dentro de TorneoProvider')
  }
  return ctx
}

export function invalidateTorneoQueries(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: torneosListQueryKey })
  void qc.invalidateQueries({ queryKey: torneoActivoQueryKey })
}
