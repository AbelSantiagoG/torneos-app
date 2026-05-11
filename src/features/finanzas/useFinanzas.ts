import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAbono,
  createEgreso,
  deleteEgreso,
  fetchCarteraRows,
  fetchResumenFinanciero,
  fetchResumenPorCategoria,
  listEgresos,
  updateEgreso,
  type AbonoInput,
  type EgresoInput,
} from '@/features/finanzas/finanzasService'
import { dashboardQueryKey } from '@/features/dashboard/useDashboard'

export const finanzasQueryKey = (torneoId: string) => ['finanzas', torneoId] as const

export function useFinanzas(torneoId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: torneoId ? finanzasQueryKey(torneoId) : ['finanzas', 'none'],
    enabled: Boolean(torneoId),
    queryFn: async () => {
      if (!torneoId) throw new Error('Sin torneo')
      const [resumen, resumenPorCategoria, cartera, egresos] = await Promise.all([
        fetchResumenFinanciero(torneoId),
        fetchResumenPorCategoria(torneoId),
        fetchCarteraRows(torneoId),
        listEgresos(torneoId),
      ])
      return { resumen, resumenPorCategoria, cartera, egresos }
    },
  })

  const invalidate = () => {
    if (!torneoId) return
    void qc.invalidateQueries({ queryKey: finanzasQueryKey(torneoId) })
    void qc.invalidateQueries({ queryKey: dashboardQueryKey(torneoId) })
  }

  const createEgresoMut = useMutation({
    mutationFn: (input: EgresoInput) => createEgreso(torneoId!, input),
    onSuccess: invalidate,
  })

  const updateEgresoMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EgresoInput> }) => updateEgreso(id, input),
    onSuccess: invalidate,
  })

  const deleteEgresoMut = useMutation({
    mutationFn: (id: string) => deleteEgreso(id),
    onSuccess: invalidate,
  })

  const createAbonoMut = useMutation({
    mutationFn: (input: AbonoInput) => createAbono(torneoId!, input),
    onSuccess: invalidate,
  })

  return {
    ...query,
    createEgreso: createEgresoMut.mutateAsync,
    updateEgreso: updateEgresoMut.mutateAsync,
    deleteEgreso: deleteEgresoMut.mutateAsync,
    createAbono: createAbonoMut.mutateAsync,
    isMutating:
      createEgresoMut.isPending ||
      updateEgresoMut.isPending ||
      deleteEgresoMut.isPending ||
      createAbonoMut.isPending,
  }
}
