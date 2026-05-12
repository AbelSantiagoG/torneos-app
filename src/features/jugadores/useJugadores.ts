import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cambiarJugadorDeEquipo,
  createJugadorConEquipo,
  desactivarJugador,
  eliminarJugador,
  getJugadoresByEquipo,
  updateJugador,
  type JugadorCreateInput,
  type JugadorUpdateInput,
} from '@/features/jugadores/jugadoresService'
import { equiposQueryKey } from '@/features/equipos/useEquipos'
import { jugadoresCategoriaQueryKey } from '@/features/jugadores/useJugadoresPorCategoria'

export const jugadoresQueryKey = (equipoId: string) => ['jugadores', equipoId] as const

export function useJugadores(equipoId: string | undefined, categoriaId: string | undefined) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: equipoId && categoriaId ? jugadoresQueryKey(equipoId) : ['jugadores', 'none'],
    queryFn: () => getJugadoresByEquipo(equipoId!, categoriaId!),
    enabled: Boolean(equipoId && categoriaId),
  })

  const invalidateEquipo = () => {
    if (categoriaId) {
      void qc.invalidateQueries({ queryKey: equiposQueryKey(categoriaId) })
      void qc.invalidateQueries({ queryKey: jugadoresCategoriaQueryKey(categoriaId) })
    }
    if (equipoId) void qc.invalidateQueries({ queryKey: jugadoresQueryKey(equipoId) })
  }

  const createMut = useMutation({
    mutationFn: (data: JugadorCreateInput) => createJugadorConEquipo(data, equipoId!),
    onSuccess: invalidateEquipo,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: JugadorUpdateInput }) => updateJugador(id, data),
    onSuccess: invalidateEquipo,
  })

  const transferMut = useMutation({
    mutationFn: ({ jugadorId, equipoNuevoId, motivo }: { jugadorId: string; equipoNuevoId: string; motivo: string }) =>
      cambiarJugadorDeEquipo(jugadorId, equipoNuevoId, motivo),
    onSuccess: () => {
      invalidateEquipo()
      void qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'jugadores',
      })
    },
  })

  const deactivateMut = useMutation({
    mutationFn: (jugadorId: string) => desactivarJugador(jugadorId),
    onSuccess: invalidateEquipo,
  })

  const deleteMut = useMutation({
    mutationFn: (jugadorId: string) => eliminarJugador(jugadorId),
    onSuccess: invalidateEquipo,
  })

  return {
    ...query,
    createJugador: createMut.mutateAsync,
    updateJugador: updateMut.mutateAsync,
    cambiarJugadorDeEquipo: transferMut.mutateAsync,
    desactivarJugador: deactivateMut.mutateAsync,
    eliminarJugador: deleteMut.mutateAsync,
    isMutating:
      createMut.isPending ||
      updateMut.isPending ||
      transferMut.isPending ||
      deactivateMut.isPending ||
      deleteMut.isPending,
  }
}
