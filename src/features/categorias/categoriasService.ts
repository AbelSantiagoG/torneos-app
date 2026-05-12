import { supabase } from '@/lib/supabase'
import type { CategoriaRow, FormatoCompetencia } from '@/types/database'
import { mapCategoriaRow, type Categoria } from '@/types/torneo'

function throwOnError<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message)
  }
  return result.data
}

async function countEquiposPorCategoria(categoriaIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (categoriaIds.length === 0) return map
  const result = await supabase.from('equipos').select('categoria_id').in('categoria_id', categoriaIds)
  const rows = throwOnError(result) as { categoria_id: string }[]
  for (const r of rows) {
    map.set(r.categoria_id, (map.get(r.categoria_id) ?? 0) + 1)
  }
  return map
}

async function countPartidosPorCategoria(categoriaIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (categoriaIds.length === 0) return map
  const result = await supabase.from('partidos').select('categoria_id').in('categoria_id', categoriaIds)
  const rows = throwOnError(result) as { categoria_id: string }[]
  for (const r of rows) {
    map.set(r.categoria_id, (map.get(r.categoria_id) ?? 0) + 1)
  }
  return map
}

export async function getCategorias(torneoId: string): Promise<Categoria[]> {
  const result = await supabase
    .from('categorias')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  const rows = throwOnError(result) as CategoriaRow[]
  const ids = rows.map((r) => r.id)
  const [eqMap, parMap] = await Promise.all([countEquiposPorCategoria(ids), countPartidosPorCategoria(ids)])

  return rows.map((row) =>
    mapCategoriaRow(row, {
      equipos: eqMap.get(row.id) ?? 0,
      partidos: parMap.get(row.id) ?? 0,
    }),
  )
}

export type CategoriaInput = {
  nombre: string
  rango_edad?: string | null
  edad_min?: number | null
  edad_max?: number | null
  color?: string | null
  orden?: number
  valor_inscripcion: number
  tarifa_arbitraje: number
  formato: FormatoCompetencia
}

export async function createCategoria(torneoId: string, data: CategoriaInput): Promise<CategoriaRow> {
  const { data: maxRows, error: maxErr } = await supabase
    .from('categorias')
    .select('orden')
    .eq('torneo_id', torneoId)
    .order('orden', { ascending: false })
    .limit(1)
  if (maxErr) throw new Error(maxErr.message)
  const nextOrden = (maxRows?.[0] as { orden: number } | undefined)?.orden != null ? (maxRows[0] as { orden: number }).orden + 1 : 0

  const insert = {
    torneo_id: torneoId,
    nombre: data.nombre,
    rango_edad: data.rango_edad ?? null,
    edad_min: data.edad_min ?? null,
    edad_max: data.edad_max ?? null,
    color: data.color ?? '#22c55e',
    orden: nextOrden,
    activa: true,
    valor_inscripcion: data.valor_inscripcion,
    tarifa_arbitraje: data.tarifa_arbitraje,
    formato: data.formato,
  }

  const result = await supabase.from('categorias').insert(insert).select('*').single()
  return throwOnError(result) as CategoriaRow
}

export async function updateCategoria(
  id: string,
  data: Partial<CategoriaInput> & { activa?: boolean },
): Promise<CategoriaRow> {
  const patch: Record<string, unknown> = {}
  if (data.nombre !== undefined) patch.nombre = data.nombre
  if (data.rango_edad !== undefined) patch.rango_edad = data.rango_edad
  if (data.edad_min !== undefined) patch.edad_min = data.edad_min
  if (data.edad_max !== undefined) patch.edad_max = data.edad_max
  if (data.color !== undefined) patch.color = data.color
  if (data.valor_inscripcion !== undefined) patch.valor_inscripcion = data.valor_inscripcion
  if (data.tarifa_arbitraje !== undefined) patch.tarifa_arbitraje = data.tarifa_arbitraje
  if (data.formato !== undefined) patch.formato = data.formato
  if (data.activa !== undefined) patch.activa = data.activa
  if (data.orden !== undefined) patch.orden = data.orden

  const result = await supabase.from('categorias').update(patch).eq('id', id).select('*').single()
  return throwOnError(result) as CategoriaRow
}

export async function toggleCategoria(id: string, activa: boolean): Promise<CategoriaRow> {
  return updateCategoria(id, { activa })
}

export async function getCategoriaById(id: string): Promise<CategoriaRow | null> {
  const result = await supabase.from('categorias').select('*').eq('id', id).maybeSingle()
  return throwOnError(result) as CategoriaRow | null
}

export async function deleteCategoria(id: string): Promise<void> {
  const eqRes = await supabase.from('equipos').select('id', { count: 'exact', head: true }).eq('categoria_id', id)
  if (eqRes.error) throw new Error(eqRes.error.message)
  if ((eqRes.count ?? 0) > 0) {
    throw new Error('No se puede eliminar la categoría: tiene equipos asociados.')
  }

  const parRes = await supabase.from('partidos').select('id', { count: 'exact', head: true }).eq('categoria_id', id)
  if (parRes.error) throw new Error(parRes.error.message)
  if ((parRes.count ?? 0) > 0) {
    throw new Error('No se puede eliminar la categoría: tiene partidos asociados.')
  }

  const result = await supabase.from('categorias').delete().eq('id', id)
  if (result.error) {
    throw new Error(result.error.message)
  }
}
