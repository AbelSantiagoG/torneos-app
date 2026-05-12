import { useQuery } from '@tanstack/react-query'
import { loadPartidosTorneoBundle, type PartidosTorneoBundle } from '@/features/partidos/partidosService'

export const partidosTorneoQueryKey = (torneoId: string) => ['partidos-torneo', torneoId] as const

export function usePartidosTorneo(torneoId: string | undefined) {
  return useQuery({
    queryKey: torneoId ? partidosTorneoQueryKey(torneoId) : ['partidos-torneo', 'none'],
    enabled: Boolean(torneoId),
    queryFn: (): Promise<PartidosTorneoBundle> => loadPartidosTorneoBundle(torneoId!),
  })
}
