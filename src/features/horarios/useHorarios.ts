import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createHorario, deleteHorario, getHorarios, updateHorario, type HorarioInput } from '@/features/horarios/horariosService'

export const horariosQueryKey = (torneoId: string) => ['horarios', torneoId] as const

export function useHorarios(torneoId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: torneoId ? horariosQueryKey(torneoId) : ['horarios', 'none'],
    queryFn: () => getHorarios(torneoId!),
    enabled: Boolean(torneoId),
  })

  const invalidate = () => {
    if (torneoId) void qc.invalidateQueries({ queryKey: horariosQueryKey(torneoId) })
  }

  const createMut = useMutation({
    mutationFn: (data: HorarioInput) => createHorario(torneoId!, data),
    onSuccess: invalidate,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HorarioInput> }) => updateHorario(id, data),
    onSuccess: invalidate,
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHorario(id),
    onSuccess: invalidate,
  })

  return {
    ...query,
    createHorario: createMut.mutateAsync,
    updateHorario: updateMut.mutateAsync,
    deleteHorario: deleteMut.mutateAsync,
    isMutating: createMut.isPending || updateMut.isPending || deleteMut.isPending,
  }
}
