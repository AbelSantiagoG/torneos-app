import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createEquipo, deleteEquipo, getEquiposByCategoria, updateEquipo, type EquipoInput } from '@/features/equipos/equiposService'
import { categoriasQueryKey } from '@/features/categorias/useCategorias'

export const equiposQueryKey = (categoriaId: string) => ['equipos', categoriaId] as const

export function useEquipos(categoriaId: string | undefined, torneoId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: categoriaId ? equiposQueryKey(categoriaId) : ['equipos', 'none'],
    queryFn: () => getEquiposByCategoria(categoriaId!),
    enabled: Boolean(categoriaId && torneoId),
  })

  const invalidate = () => {
    if (categoriaId) void qc.invalidateQueries({ queryKey: equiposQueryKey(categoriaId) })
    if (torneoId) void qc.invalidateQueries({ queryKey: categoriasQueryKey(torneoId) })
  }

  const createMut = useMutation({
    mutationFn: ({ categoriaId: catId, data }: { categoriaId: string; data: EquipoInput }) =>
      createEquipo(torneoId!, catId, data),
    onSuccess: invalidate,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipoInput> }) => updateEquipo(id, data),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteEquipo(id),
    onSuccess: invalidate,
  })

  return {
    ...query,
    createEquipo: createMut.mutateAsync,
    updateEquipo: updateMut.mutateAsync,
    deleteEquipo: deleteMut.mutateAsync,
    isMutating: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
