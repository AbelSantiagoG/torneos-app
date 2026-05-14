import { supabase } from '@/lib/supabase'
import { pickStr } from '@/features/_shared/supabaseHelpers'

export type VistaRow = Record<string, unknown>

async function fetchViewTorneo(view: string, torneoId: string): Promise<VistaRow[]> {
  const r = await supabase.from(view).select('*').eq('torneo_id', torneoId)
  if (!r.error && r.data && r.data.length > 0) return r.data as VistaRow[]

  const r2 = await supabase.from(view).select('*')
  if (r2.error || !r2.data) return []
  return (r2.data as VistaRow[]).filter((row) => pickStr(row, 'torneo_id') === torneoId)
}

export function filterVistaRowsPorCategoria(rows: VistaRow[], categoriaId: string): VistaRow[] {
  if (!categoriaId) return rows
  return rows.filter((r) => {
    const cid = pickStr(r, 'categoria_id')
    return !cid || cid === categoriaId
  })
}

export function filterVistaRowsPorFase(rows: VistaRow[], faseTorneoId: string): VistaRow[] {
  if (!faseTorneoId) return rows
  return rows.filter((r) => {
    const fid = pickStr(r, 'fase_torneo_id', 'fase_id')
    return !fid || fid === faseTorneoId
  })
}

export async function fetchEstadisticasTorneo(torneoId: string): Promise<{
  tabla: VistaRow[]
  goleadores: VistaRow[]
  disciplina: VistaRow[]
}> {
  const [tabla, goleadores, disciplina] = await Promise.all([
    fetchViewTorneo('vw_tabla_posiciones', torneoId),
    fetchViewTorneo('vw_goleadores', torneoId),
    fetchViewTorneo('vw_disciplina', torneoId),
  ])
  return { tabla, goleadores, disciplina }
}

const SKIP_KEYS = new Set(['torneo_id', 'created_at', 'updated_at'])

const PRIORITY_KEYS = [
  'posicion',
  'pos',
  'equipo_nombre',
  'nombre_equipo',
  'equipo',
  'club',
  'pj',
  'pg',
  'pe',
  'pp',
  'gf',
  'gc',
  'dg',
  'puntos',
  'pts',
  'jugador',
  'nombre_jugador',
  'nombre_completo',
  'nombres',
  'goles',
  'amarillas',
  'rojas',
]

export function rowKeysForTable(rows: VistaRow[]): string[] {
  if (!rows.length) return []
  const keys = Object.keys(rows[0])
  const rest = keys.filter((k) => !PRIORITY_KEYS.includes(k) && !SKIP_KEYS.has(k)).sort()
  const ordered = [
    ...PRIORITY_KEYS.filter((k) => keys.includes(k)),
    ...rest.filter((k) => !PRIORITY_KEYS.includes(k)),
  ]
  return ordered.filter((k) => !SKIP_KEYS.has(k)).slice(0, 16)
}

export function formatVistaCell(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
