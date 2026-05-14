import { supabase } from '@/lib/supabase'
import { pickStr } from '@/features/_shared/supabaseHelpers'
import { toUserError } from '@/lib/supabaseErrors'
import type { TipoFaseTorneoDb } from '@/types/database'

export type FaseTorneoUi = {
  id: string
  categoria_id: string
  nombre: string
  tipo: TipoFaseTorneoDb | string
  orden: number
  activa: boolean
  reinicia_tabla: boolean
}

function mapFaseRow(row: Record<string, unknown>): FaseTorneoUi {
  return {
    id: String(row.id ?? ''),
    categoria_id: String(row.categoria_id ?? ''),
    nombre: String(row.nombre ?? ''),
    tipo: pickStr(row, 'tipo', 'tipo_fase') || 'todos_contra_todos',
    orden: Number(row.orden ?? 0),
    activa: Boolean(row.activa),
    reinicia_tabla: Boolean(row.reinicia_tabla ?? (row as { reinicia_tabla_posiciones?: boolean }).reinicia_tabla_posiciones),
  }
}

export async function listFasesPorCategoria(categoriaId: string): Promise<FaseTorneoUi[]> {
  const r = await supabase.from('fases_torneo').select('*').eq('categoria_id', categoriaId).order('orden')
  if (r.error) throw toUserError(r.error, 'fixture')
  return ((r.data ?? []) as Record<string, unknown>[]).map(mapFaseRow)
}

export async function getFaseActivaCategoria(categoriaId: string): Promise<FaseTorneoUi | null> {
  const list = await listFasesPorCategoria(categoriaId)
  return list.find((f) => f.activa) ?? list[0] ?? null
}

export async function createFaseTorneo(input: {
  categoria_id: string
  nombre: string
  tipo: TipoFaseTorneoDb | string
  reinicia_tabla: boolean
}): Promise<string> {
  const existentes = await listFasesPorCategoria(input.categoria_id)
  const orden = existentes.length ? Math.max(...existentes.map((f) => f.orden)) + 1 : 1

  const base = {
    categoria_id: input.categoria_id,
    nombre: input.nombre.trim(),
    orden,
    activa: existentes.length === 0,
    reinicia_tabla: input.reinicia_tabla,
  }

  let r = await supabase.from('fases_torneo').insert({ ...base, tipo_fase: input.tipo }).select('id').single()
  if (r.error) {
    r = await supabase.from('fases_torneo').insert({ ...base, tipo: input.tipo }).select('id').single()
  }
  if (r.error) throw toUserError(r.error, 'fixture')
  return String((r.data as { id: string }).id)
}

export async function updateFaseTorneo(
  faseId: string,
  patch: Partial<Pick<FaseTorneoUi, 'nombre' | 'tipo' | 'orden' | 'reinicia_tabla'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.nombre != null) dbPatch.nombre = patch.nombre
  if (patch.orden != null) dbPatch.orden = patch.orden
  if (patch.reinicia_tabla != null) dbPatch.reinicia_tabla = patch.reinicia_tabla
  if (patch.tipo != null) {
    dbPatch.tipo_fase = patch.tipo
  }
  let r = await supabase.from('fases_torneo').update(dbPatch).eq('id', faseId)
  if (r.error && patch.tipo != null) {
    const alt = { ...dbPatch }
    delete alt.tipo_fase
    alt.tipo = patch.tipo
    r = await supabase.from('fases_torneo').update(alt).eq('id', faseId)
  }
  if (r.error) throw toUserError(r.error, 'fixture')
}

export async function setFaseActivaCategoria(categoriaId: string, faseId: string): Promise<void> {
  const r0 = await supabase.from('fases_torneo').update({ activa: false }).eq('categoria_id', categoriaId)
  if (r0.error) throw toUserError(r0.error, 'fixture')
  const r1 = await supabase.from('fases_torneo').update({ activa: true }).eq('id', faseId).eq('categoria_id', categoriaId)
  if (r1.error) throw toUserError(r1.error, 'fixture')
}
