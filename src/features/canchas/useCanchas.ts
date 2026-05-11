import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCancha, deleteCancha, getCanchas, updateCancha, type CanchaInput } from '@/features/canchas/canchasService'

export const canchasQueryKey = (torneoId: string) => ['canchas', torneoId] as const

export function useCanchas(torneoId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: torneoId ? canchasQueryKey(torneoId) : ['canchas', 'none'],
    queryFn: () => getCanchas(torneoId!),
    enabled: Boolean(torneoId),
  })

  const invalidate = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: canchasQueryKey(torneoId) })
  }

  const createMut = useMutation({
    mutationFn: (data: CanchaInput) => createCancha(torneoId!, data),
    onSuccess: invalidate,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CanchaInput> }) => updateCancha(id, data),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCancha(id),
    onSuccess: invalidate,
  })

  return {
    ...query,
    createCancha: createMut.mutateAsync,
    updateCancha: updateMut.mutateAsync,
    deleteCancha: deleteMut.mutateAsync,
    isMutating: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
