import { supabase } from '@/lib/supabase'
import { asRow, pickNum, pickStr, throwOnError } from '@/features/_shared/supabaseHelpers'

export type ArbitrajeRowUi = Record<string, unknown>

export type ResumenArbitrajesUi = {
  totalPartidos: number
  totalPagado: number
  totalPendiente: number
}

export async function listArbitrajesTorneo(torneoId: string): Promise<ArbitrajeRowUi[]> {
  const direct = await supabase.from('arbitrajes').select('*').eq('torneo_id', torneoId)
  if (!direct.error && direct.data && direct.data.length > 0) {
    return direct.data as ArbitrajeRowUi[]
  }

  const partRes = await supabase.from('partidos').select('id').eq('torneo_id', torneoId)
  const partIds = (throwOnError(partRes) as { id: string }[]).map((p) => p.id)
  if (!partIds.length) return []

  const arb = await supabase.from('arbitrajes').select('*').in('partido_id', partIds)
  if (arb.error) throw new Error(arb.error.message)
  return (arb.data ?? []) as ArbitrajeRowUi[]
}

export async function fetchResumenArbitrajes(torneoId: string): Promise<ResumenArbitrajesUi> {
  const r = await supabase.from('vw_resumen_arbitrajes').select('*').eq('torneo_id', torneoId).maybeSingle()
  if (!r.error && r.data) {
    const row = asRow(r.data)
    return {
      totalPartidos: Math.round(
        pickNum(row, 'total_partidos', 'partidos', 'cantidad_partidos', 'num_partidos'),
      ),
      totalPagado: pickNum(row, 'total_pagado', 'pagado', 'monto_pagado'),
      totalPendiente: pickNum(row, 'total_pendiente', 'pendiente', 'saldo_pendiente'),
    }
  }

  const r2 = await supabase.from('vw_resumen_arbitrajes').select('*').limit(1).maybeSingle()
  if (!r2.error && r2.data) {
    const row = asRow(r2.data)
    if (!pickStr(row, 'torneo_id') || pickStr(row, 'torneo_id') === torneoId) {
      return {
        totalPartidos: Math.round(pickNum(row, 'total_partidos', 'partidos')),
        totalPagado: pickNum(row, 'total_pagado', 'pagado'),
        totalPendiente: pickNum(row, 'total_pendiente', 'pendiente'),
      }
    }
  }

  return { totalPartidos: 0, totalPagado: 0, totalPendiente: 0 }
}
