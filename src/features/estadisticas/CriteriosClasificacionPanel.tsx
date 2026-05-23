import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { translateUserError } from '@/lib/errorMessages'
import type { CriterioClasificacion } from '@/features/estadisticas/estadisticasService'
import {
  CRITERIOS_DISPONIBLES,
  CRITERIOS_DEFECTO,
  criteriosOrdenadosDesdeRows,
  guardarCriteriosClasificacionFase,
  listCriteriosClasificacionFase,
  normalizarOrdenCriterios,
} from '@/features/estadisticas/criteriosClasificacionService'
import { estadisticasCriteriosQueryKey } from '@/features/estadisticas/estadisticasCache'

type Props = {
  torneoId: string
  categoriaId: string
  faseId: string
  onCriteriosChange: (criterios: CriterioClasificacion[]) => void
}

export function CriteriosClasificacionPanel({ torneoId, categoriaId, faseId, onCriteriosChange }: Props) {
  const qc = useQueryClient()
  const [local, setLocal] = useState<CriterioClasificacion[]>(CRITERIOS_DEFECTO)
  const [nuevo, setNuevo] = useState<CriterioClasificacion | ''>('')

  const q = useQuery({
    queryKey: estadisticasCriteriosQueryKey(faseId),
    enabled: Boolean(faseId),
    queryFn: () => listCriteriosClasificacionFase(faseId),
  })

  const criterios = q.data?.length ? criteriosOrdenadosDesdeRows(q.data) : local

  useEffect(() => {
    if (q.data?.length) {
      const ordered = criteriosOrdenadosDesdeRows(q.data)
      setLocal(ordered)
      onCriteriosChange(ordered)
    }
  }, [q.data, onCriteriosChange])

  useEffect(() => {
    setLocal(CRITERIOS_DEFECTO)
    setNuevo('')
    onCriteriosChange(CRITERIOS_DEFECTO)
  }, [faseId, onCriteriosChange])

  const saveMut = useMutation({
    mutationFn: (list: CriterioClasificacion[]) =>
      guardarCriteriosClasificacionFase({
        torneoId,
        categoriaId,
        faseTorneoId: faseId,
        criterios: list,
      }),
    onSuccess: async (rows) => {
      const ordered = criteriosOrdenadosDesdeRows(rows)
      setLocal(ordered)
      onCriteriosChange(ordered)
      qc.setQueryData(estadisticasCriteriosQueryKey(faseId), rows)
      try {
        await qc.invalidateQueries({ queryKey: estadisticasCriteriosQueryKey(faseId) })
      } catch (error) {
        console.error('Error refrescando criterios de clasificaciÃ³n', { faseId, error })
        toast.warning('Criterios guardados, pero no se pudo actualizar la vista.')
        return
      }
      toast.success('Criterios de clasificación guardados.')
    },
    onError: (e) => {
      console.error('Error en estadísticas', { faseId, error: e })
      toast.error('No se pudieron guardar los criterios de clasificación.')
    },
  })

  const persist = (next: CriterioClasificacion[]) => {
    const normalized = normalizarOrdenCriterios(next)
    setLocal(normalized)
    onCriteriosChange(normalized)
    saveMut.mutate(normalized)
  }

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...criterios]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item!)
    persist(next)
  }

  const remove = (idx: number) => {
    persist(criterios.filter((_, i) => i !== idx))
  }

  const add = () => {
    if (!nuevo || criterios.includes(nuevo)) return
    persist([...criterios, nuevo])
    setNuevo('')
  }

  const disponibles = CRITERIOS_DISPONIBLES.filter((c) => !criterios.includes(c.id))

  if (!faseId) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Selecciona una fase para configurar criterios.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criterios de clasificación</CardTitle>
        <CardDescription>
          Orden de desempate para la tabla. Se guardan por fase y se aplican al instante (1, 2, 3…).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <div className="space-y-2">
              {criterios.map((criterio, idx) => {
                const label = CRITERIOS_DISPONIBLES.find((c) => c.id === criterio)?.label ?? criterio
                return (
                  <div
                    key={`${criterio}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs">
                        {idx + 1}
                      </span>
                      {label}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={idx === 0 || saveMut.isPending}
                        onClick={() => move(idx, -1)}
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={idx === criterios.length - 1 || saveMut.isPending}
                        onClick={() => move(idx, 1)}
                        aria-label="Bajar"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        disabled={saveMut.isPending}
                        onClick={() => remove(idx)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
            {disponibles.length > 0 && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <span className="text-xs text-muted-foreground">Agregar criterio</span>
                  <Select value={nuevo || undefined} onValueChange={(v) => setNuevo(v as CriterioClasificacion)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elegir criterio" />
                    </SelectTrigger>
                    <SelectContent>
                      {disponibles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" disabled={!nuevo || saveMut.isPending} onClick={add}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar
                </Button>
              </div>
            )}
            {saveMut.isPending && <p className="text-xs text-muted-foreground">Guardando criterios…</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
