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

/** Filas desde actas (vista detalle) para liquidación de arbitraje. */
export async function fetchLiquidacionesArbitrajeDesdeActas(torneoId: string): Promise<ArbitrajeRowUi[]> {
  const r = await supabase.from('vw_actas_partido_detalle').select('*').eq('torneo_id', torneoId)
  if (r.error || !r.data?.length) return []
  return r.data as ArbitrajeRowUi[]
}

export async function crearArbitrajeSiNoExiste(input: {
  torneo_id: string
  partido_id: string
  valor: number
}): Promise<void> {
  const ex = await supabase.from('arbitrajes').select('id').eq('partido_id', input.partido_id).maybeSingle()
  if (ex.data) return
  const ins = await supabase.from('arbitrajes').insert({
    torneo_id: input.torneo_id,
    partido_id: input.partido_id,
    valor: input.valor,
    estado_pago: 'pendiente',
  })
  if (ins.error) throw new Error(ins.error.message)
}
