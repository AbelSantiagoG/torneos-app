import { useQuery } from '@tanstack/react-query'
import { fetchEstadisticasTorneo } from '@/features/estadisticas/estadisticasService'

export const estadisticasQueryKey = (torneoId: string) => ['estadisticas', torneoId] as const

export function useEstadisticas(torneoId: string | undefined) {
  return useQuery({
    queryKey: torneoId ? estadisticasQueryKey(torneoId) : ['estadisticas', 'none'],
    enabled: Boolean(torneoId),
    queryFn: () => fetchEstadisticasTorneo(torneoId!),
  })
}
