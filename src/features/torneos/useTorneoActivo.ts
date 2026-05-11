import { useQuery } from '@tanstack/react-query'
import { getTorneoActivo } from '@/features/torneos/torneosService'
import type { TorneoActivo } from '@/types/torneo'

export const torneoActivoQueryKey = ['torneo-activo'] as const

export function useTorneoActivo() {
  return useQuery({
    queryKey: torneoActivoQueryKey,
    queryFn: async (): Promise<TorneoActivo | null> => {
      const row = await getTorneoActivo()
      if (!row) return null
      return {
        id: row.id,
        nombre: row.nombre,
        organizacion: row.organizacion,
        logo_url: row.logo_url,
        fecha_inicio: row.fecha_inicio,
        fecha_fin: row.fecha_fin,
        descripcion: row.descripcion,
      }
    },
    staleTime: 60_000,
  })
}
