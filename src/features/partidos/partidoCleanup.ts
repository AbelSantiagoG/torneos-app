import { supabase } from '@/lib/supabase'
import { toUserError } from '@/lib/supabaseErrors'

/** Elimina partido y dependencias (sin importar equiposService para evitar ciclos). */
export async function deletePartidoCascade(partidoId: string): Promise<void> {
  const steps = [
    () => supabase.from('programaciones_partido').delete().eq('partido_id', partidoId),
    () => supabase.from('arbitrajes').delete().eq('partido_id', partidoId),
    () => supabase.from('goles').delete().eq('partido_id', partidoId),
    () => supabase.from('tarjetas').delete().eq('partido_id', partidoId),
    () => supabase.from('actas_partido').delete().eq('partido_id', partidoId),
    () => supabase.from('partidos').delete().eq('id', partidoId),
  ]
  for (const fn of steps) {
    const r = await fn()
    if (r.error) throw toUserError(r.error, 'fixture')
  }
}
