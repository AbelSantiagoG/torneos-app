import { useQuery } from '@tanstack/react-query'
import {
  getCategoriaEstadosDashboard,
  getDashboardConflicts,
  getDashboardCounts,
  getProximosPartidos,
  getResumenFinancieroFromView,
  getUltimosResultados,
} from '@/features/dashboard/dashboardService'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'

export const dashboardQueryKey = (torneoId: string) => ['dashboard', torneoId] as const

export function useDashboard() {
  const { data: torneo, isLoading: torneoLoading, error: torneoError } = useTorneoActivo()
  const torneoId = torneo?.id

  const q = useQuery({
    queryKey: torneoId ? dashboardQueryKey(torneoId) : ['dashboard', 'none'],
    enabled: Boolean(torneoId),
    queryFn: async () => {
      if (!torneoId) throw new Error('Sin torneo')
      const [counts, resumen, categorias, proximos, ultimos, conflicts] = await Promise.all([
        getDashboardCounts(torneoId),
        getResumenFinancieroFromView(torneoId),
        getCategoriaEstadosDashboard(torneoId),
        getProximosPartidos(torneoId, 4),
        getUltimosResultados(torneoId, 4),
        getDashboardConflicts(torneoId),
      ])
      return { counts, resumen, categorias, proximos, ultimos, conflicts }
    },
  })

  return {
    torneo,
    torneoLoading,
    torneoError,
    ...q,
  }
}
