import { useQuery } from '@tanstack/react-query'
import { listReportesGenerados } from '@/features/reportes/reportesService'

export const reportesQueryKey = (torneoId: string) => ['reportes', torneoId] as const

export function useReportesGenerados(torneoId: string | undefined) {
  return useQuery({
    queryKey: torneoId ? reportesQueryKey(torneoId) : ['reportes', 'none'],
    enabled: Boolean(torneoId),
    queryFn: () => listReportesGenerados(torneoId!),
  })
}
