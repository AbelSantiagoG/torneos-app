import { useQuery } from '@tanstack/react-query'
import { fetchResumenArbitrajes, listArbitrajesTorneo } from '@/features/arbitrajes/arbitrajesService'

export const arbitrajesQueryKey = (torneoId: string) => ['arbitrajes', torneoId] as const

export function useArbitrajes(torneoId: string | undefined) {
  return useQuery({
    queryKey: torneoId ? arbitrajesQueryKey(torneoId) : ['arbitrajes', 'none'],
    enabled: Boolean(torneoId),
    queryFn: async () => {
      if (!torneoId) throw new Error('Sin torneo')
      const [lista, resumen] = await Promise.all([listArbitrajesTorneo(torneoId), fetchResumenArbitrajes(torneoId)])
      return { lista, resumen }
    },
  })
}
