import type { QueryClient } from '@tanstack/react-query'

export const estadisticasQueryKey = (torneoId: string, categoriaId = '', faseId = '') =>
  ['estadisticas', torneoId, categoriaId, faseId] as const

export const estadisticasCriteriosQueryKey = (faseId: string) => ['criterios-clasificacion', faseId] as const

export const tablaPosicionesQueryKey = (faseId: string) => ['tabla-posiciones-config', faseId] as const

/** Refresca estadísticas, fixture y contadores tras guardar acta o ajustes. */
export function invalidateEstadisticasQueries(
  qc: QueryClient,
  opts: { torneoId: string; categoriaId?: string; faseId?: string },
): void {
  const { torneoId, categoriaId, faseId } = opts
  void qc.invalidateQueries({ queryKey: ['estadisticas', torneoId] })
  void qc.invalidateQueries({ queryKey: ['estadisticas-partidos-jugados', torneoId] })
  void qc.invalidateQueries({ queryKey: ['partidos-torneo', torneoId] })
  void qc.invalidateQueries({ queryKey: ['acta-partidos', torneoId] })
  if (categoriaId) {
    void qc.invalidateQueries({ queryKey: ['estadisticas-fases', categoriaId] })
    void qc.invalidateQueries({ queryKey: ['acta-partidos', torneoId, categoriaId] })
  }
  if (faseId) {
    void qc.invalidateQueries({ queryKey: tablaPosicionesQueryKey(faseId) })
    void qc.invalidateQueries({ queryKey: estadisticasCriteriosQueryKey(faseId) })
  }
  void qc.invalidateQueries({ queryKey: ['tabla-posiciones-config'] })
  void qc.invalidateQueries({ queryKey: ['criterios-clasificacion'] })
}
