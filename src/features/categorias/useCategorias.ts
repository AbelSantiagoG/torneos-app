import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCategoria,
  deleteCategoria,
  getCategorias,
  toggleCategoria,
  updateCategoria,
  type CategoriaInput,
} from '@/features/categorias/categoriasService'
import { torneoActivoQueryKey } from '@/features/torneos/useTorneoActivo'

export const categoriasQueryKey = (torneoId: string) => ['categorias', torneoId] as const

export function useCategorias(torneoId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: torneoId ? categoriasQueryKey(torneoId) : ['categorias', 'none'],
    queryFn: () => getCategorias(torneoId!),
    enabled: Boolean(torneoId),
  })

  const invalidate = () => {
    if (torneoId) {
      void qc.invalidateQueries({ queryKey: categoriasQueryKey(torneoId) })
      void qc.invalidateQueries({ queryKey: torneoActivoQueryKey })
    }
  }

  const createMut = useMutation({
    mutationFn: (data: CategoriaInput) => createCategoria(torneoId!, data),
    onSuccess: invalidate,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoriaInput> & { activa?: boolean } }) =>
      updateCategoria(id, data),
    onSuccess: invalidate,
  })

  const toggleMut = useMutation({
    mutationFn: ({ id, activa }: { id: string; activa: boolean }) => toggleCategoria(id, activa),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategoria(id),
    onSuccess: invalidate,
  })

  return {
    ...query,
    createCategoria: createMut.mutateAsync,
    updateCategoria: updateMut.mutateAsync,
    toggleCategoria: toggleMut.mutateAsync,
    deleteCategoria: deleteMut.mutateAsync,
    isMutating: createMut.isPending || updateMut.isPending || toggleMut.isPending || deleteMut.isPending,
  }
}
