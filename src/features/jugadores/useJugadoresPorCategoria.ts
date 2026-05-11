import { useQuery } from '@tanstack/react-query'
import { getJugadoresActivosPorCategoria } from '@/features/jugadores/jugadoresService'

export const jugadoresCategoriaQueryKey = (categoriaId: string) => ['jugadores-categoria', categoriaId] as const

export function useJugadoresPorCategoria(categoriaId: string | undefined) {
  return useQuery({
    queryKey: categoriaId ? jugadoresCategoriaQueryKey(categoriaId) : ['jugadores-categoria', 'none'],
    queryFn: () => getJugadoresActivosPorCategoria(categoriaId!),
    enabled: Boolean(categoriaId),
  })
}
