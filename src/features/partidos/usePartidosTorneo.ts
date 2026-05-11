import { useQuery } from '@tanstack/react-query'
import { listPartidosTorneo } from '@/features/partidos/partidosService'

export const partidosTorneoQueryKey = (torneoId: string) => ['partidos-torneo', torneoId] as const

export function usePartidosTorneo(torneoId: string | undefined) {
  return useQuery({
    queryKey: torneoId ? partidosTorneoQueryKey(torneoId) : ['partidos-torneo', 'none'],
    enabled: Boolean(torneoId),
    queryFn: () => listPartidosTorneo(torneoId!),
  })
}
