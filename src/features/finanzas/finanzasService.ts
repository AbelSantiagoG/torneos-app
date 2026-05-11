import { supabase } from '@/lib/supabase'
import { asRow, pickNum, pickStr, throwOnError } from '@/features/_shared/supabaseHelpers'
import type { ResumenFinancieroUi } from '@/features/dashboard/dashboardService'

export type CarteraRowUi = {
  equipoId: string
  equipoNombre: string
  equipoColor: string
  categoriaId: string
  categoriaNombre: string
  categoriaColor: string
  valorInscripcion: number
  totalAbonado: number
  saldo: number
  estado: 'al_dia' | 'pendiente' | 'vencido'
  pagoInscripcionId: string | null
}

export type EgresoRow = {
  id: string
  fecha: string
  concepto: string
  categoriaGasto: string
  valor: number
  responsable: string
}

export type ResumenCategoriaRow = Record<string, unknown>

function mapResumenFromRow(row: Record<string, unknown>): ResumenFinancieroUi {
  return {
    ingresosEsperados: pickNum(row, 'ingresos_esperados', 'total_esperado', 'monto_esperado_total'),
    ingresosCobrados: pickNum(row, 'ingresos_cobrados', 'total_cobrado', 'cobrado'),
    carteraPendiente: pickNum(row, 'cartera_pendiente', 'pendiente', 'saldo_pendiente'),
    totalEgresos: pickNum(row, 'total_egresos', 'egresos'),
    resultado: pickNum(row, 'resultado', 'balance', 'resultado_neto'),
  }
}

export async function fetchResumenFinanciero(torneoId: string): Promise<ResumenFinancieroUi> {
  const r = await supabase.from('vw_resumen_financiero').select('*').eq('torneo_id', torneoId).maybeSingle()
  if (!r.error && r.data) return mapResumenFromRow(asRow(r.data))
  const r2 = await supabase.from('vw_resumen_financiero').select('*').limit(1).maybeSingle()
  if (!r2.error && r2.data) {
    const row = asRow(r2.data)
    if (!pickStr(row, 'torneo_id') || pickStr(row, 'torneo_id') === torneoId) return mapResumenFromRow(row)
  }
  return {
    ingresosEsperados: 0,
    ingresosCobrados: 0,
    carteraPendiente: 0,
    totalEgresos: 0,
    resultado: 0,
  }
}

export async function fetchResumenPorCategoria(torneoId: string): Promise<ResumenCategoriaRow[]> {
  const r = await supabase.from('vw_resumen_financiero_categoria').select('*').eq('torneo_id', torneoId)
  if (!r.error && r.data?.length) return r.data as ResumenCategoriaRow[]
  const r2 = await supabase.from('vw_resumen_financiero_categoria').select('*')
  if (r2.error || !r2.data) return []
  return (r2.data as ResumenCategoriaRow[]).filter((row) => pickStr(asRow(row), 'torneo_id') === torneoId)
}

export async function fetchCarteraRows(torneoId: string): Promise<CarteraRowUi[]> {
  const v = await supabase.from('vw_cartera').select('*').eq('torneo_id', torneoId)
  if (!v.error && v.data?.length) {
    return (v.data as Record<string, unknown>[]).map(mapCarteraVwRow)
  }
  const v2 = await supabase.from('vw_cartera').select('*')
  if (!v2.error && v2.data) {
    const rows = (v2.data as Record<string, unknown>[]).filter((x) => pickStr(x, 'torneo_id') === torneoId)
    if (rows.length) return rows.map(mapCarteraVwRow)
  }

  return buildCarteraFromTables(torneoId)
}

function mapCarteraVwRow(row: Record<string, unknown>): CarteraRowUi {
  const valorInscripcion = pickNum(row, 'valor_inscripcion', 'valor_total', 'monto_esperado', 'valor_esperado')
  const totalAbonado = pickNum(row, 'total_abonado', 'abonado', 'monto_pagado', 'cobrado')
  const saldo = Math.max(0, pickNum(row, 'saldo', 'saldo_pendiente', 'pendiente') || valorInscripcion - totalAbonado)
  let estado: CarteraRowUi['estado'] = 'pendiente'
  if (saldo <= 0) estado = 'al_dia'
  else if (totalAbonado <= 0) estado = 'vencido'

  return {
    equipoId: pickStr(row, 'equipo_id', 'id_equipo'),
    equipoNombre: pickStr(row, 'equipo_nombre', 'nombre_equipo', 'equipo'),
    equipoColor: pickStr(row, 'equipo_color', 'color') || '#64748b',
    categoriaId: pickStr(row, 'categoria_id'),
    categoriaNombre: pickStr(row, 'categoria_nombre', 'nombre_categoria'),
    categoriaColor: pickStr(row, 'categoria_color') || '#64748b',
    valorInscripcion,
    totalAbonado,
    saldo,
    estado,
    pagoInscripcionId: pickStr(row, 'pago_inscripcion_id', 'id_pago_inscripcion') || null,
  }
}

async function buildCarteraFromTables(torneoId: string): Promise<CarteraRowUi[]> {
  const equipos = throwOnError(
    await supabase.from('equipos').select('id, nombre, color, categoria_id').eq('torneo_id', torneoId),
  ) as {
    id: string
    nombre: string
    color: string | null
    categoria_id: string
  }[]

  const categorias = throwOnError(
    await supabase.from('categorias').select('id, nombre, color, valor_inscripcion').eq('torneo_id', torneoId),
  ) as { id: string; nombre: string; color: string | null; valor_inscripcion: number }[]

  const equipoIds = equipos.map((e) => e.id)
  const pagosRes =
    equipoIds.length > 0
      ? await supabase.from('pagos_inscripcion').select('*').in('equipo_id', equipoIds)
      : { data: [] as Record<string, unknown>[], error: null }
  const abonosRes =
    equipoIds.length > 0
      ? await supabase.from('abonos').select('*').in('equipo_id', equipoIds)
      : { data: [] as Record<string, unknown>[], error: null }

  const catMap = new Map(categorias.map((c) => [c.id, c]))
  const pagosList = (pagosRes.data ?? []) as Record<string, unknown>[]
  const pagoByEquipo = new Map<string, { id: string; row: Record<string, unknown> }>()
  for (const p of pagosList) {
    const eid = pickStr(asRow(p), 'equipo_id')
    if (eid) pagoByEquipo.set(eid, { id: pickStr(asRow(p), 'id'), row: asRow(p) })
  }

  const abonosList = abonosRes.error ? [] : ((abonosRes.data ?? []) as Record<string, unknown>[])
  const abonoByEquipo = new Map<string, number>()
  for (const a of abonosList) {
    const eid = pickStr(a, 'equipo_id')
    if (!eid) continue
    abonoByEquipo.set(eid, (abonoByEquipo.get(eid) ?? 0) + pickNum(a, 'valor', 'monto'))
  }

  return equipos.map((eq) => {
    const cat = catMap.get(eq.categoria_id)
    const valor = Number(cat?.valor_inscripcion ?? 0)
    const pago = pagoByEquipo.get(eq.id)
    const esperado =
      pago != null
        ? pickNum(pago.row, 'valor_esperado', 'monto_esperado', 'valor_inscripcion', 'monto_total') || valor
        : valor
    const abonado = abonoByEquipo.get(eq.id) ?? 0
    const saldo = Math.max(0, esperado - abonado)
    let estado: CarteraRowUi['estado'] = 'pendiente'
    if (saldo <= 0) estado = 'al_dia'
    else if (abonado <= 0) estado = 'vencido'
    return {
      equipoId: eq.id,
      equipoNombre: eq.nombre,
      equipoColor: eq.color ?? '#64748b',
      categoriaId: eq.categoria_id,
      categoriaNombre: cat?.nombre ?? '',
      categoriaColor: cat?.color ?? '#64748b',
      valorInscripcion: esperado,
      totalAbonado: abonado,
      saldo,
      estado,
      pagoInscripcionId: pago?.id ?? null,
    }
  })
}

export async function listEgresos(torneoId: string): Promise<EgresoRow[]> {
  const r = await supabase.from('egresos').select('*').eq('torneo_id', torneoId).order('fecha', { ascending: false })
  if (!r.error) return ((r.data ?? []) as Record<string, unknown>[]).map(mapEgresoRow)

  const r2 = await supabase.from('egresos').select('*').order('fecha', { ascending: false })
  if (r2.error) throw new Error(r2.error.message)
  return ((r2.data ?? []) as Record<string, unknown>[])
    .filter((row) => pickStr(row, 'torneo_id') === torneoId)
    .map(mapEgresoRow)
}

function mapEgresoRow(row: Record<string, unknown>): EgresoRow {
  const fecha = pickStr(row, 'fecha', 'fecha_gasto', 'created_at').slice(0, 10)
  return {
    id: pickStr(row, 'id'),
    fecha: fecha || pickStr(row, 'created_at').slice(0, 10),
    concepto: pickStr(row, 'concepto', 'descripcion'),
    categoriaGasto: pickStr(row, 'categoria_gasto', 'categoriaGasto', 'categoria', 'tipo'),
    valor: pickNum(row, 'valor', 'monto', 'importe'),
    responsable: pickStr(row, 'responsable', 'registrado_por', 'usuario'),
  }
}

export type EgresoInput = {
  fecha: string
  concepto: string
  categoriaGasto: string
  valor: number
  responsable: string
}

export async function createEgreso(torneoId: string, input: EgresoInput): Promise<void> {
  const payload: Record<string, unknown> = {
    torneo_id: torneoId,
    fecha: input.fecha,
    concepto: input.concepto,
    valor: input.valor,
    categoria_gasto: input.categoriaGasto,
    responsable: input.responsable,
  }
  let r = await supabase.from('egresos').insert(payload)
  if (r.error) {
    r = await supabase.from('egresos').insert({
      torneo_id: torneoId,
      fecha: input.fecha,
      concepto: input.concepto,
      valor: input.valor,
      categoriaGasto: input.categoriaGasto,
      responsable: input.responsable,
    })
  }
  if (r.error) throw new Error(r.error.message)
}

export async function updateEgreso(id: string, input: Partial<EgresoInput>): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (input.fecha !== undefined) patch.fecha = input.fecha
  if (input.concepto !== undefined) patch.concepto = input.concepto
  if (input.valor !== undefined) patch.valor = input.valor
  if (input.categoriaGasto !== undefined) {
    patch.categoria_gasto = input.categoriaGasto
    patch.categoriaGasto = input.categoriaGasto
  }
  if (input.responsable !== undefined) patch.responsable = input.responsable

  let r = await supabase.from('egresos').update(patch).eq('id', id)
  if (r.error) {
    const patch2 = { ...input }
    r = await supabase.from('egresos').update(patch2).eq('id', id)
  }
  if (r.error) throw new Error(r.error.message)
}

export async function deleteEgreso(id: string): Promise<void> {
  const r = await supabase.from('egresos').delete().eq('id', id)
  if (r.error) throw new Error(r.error.message)
}

export type AbonoInput = {
  equipoId: string
  valor: number
  concepto: string
  fecha: string
  pagoInscripcionId?: string | null
}

export async function createAbono(torneoId: string, input: AbonoInput): Promise<void> {
  let pagoId = input.pagoInscripcionId ?? null
  if (!pagoId) {
    const p = await supabase.from('pagos_inscripcion').select('id').eq('equipo_id', input.equipoId).maybeSingle()
    if (!p.error && p.data) pagoId = (p.data as { id: string }).id
  }
  if (!pagoId) {
    throw new Error(
      'No hay registro de pago de inscripción para este equipo. El alta de equipo debería crearlo automáticamente; si no existe, crea el pago en Supabase o vuelve a crear el equipo.',
    )
  }

  const base = {
    torneo_id: torneoId,
    equipo_id: input.equipoId,
    valor: input.valor,
    concepto: input.concepto,
    fecha: input.fecha,
    pago_inscripcion_id: pagoId,
  }
  const r = await supabase.from('abonos').insert(base)
  if (r.error) {
    const r2 = await supabase.from('abonos').insert({
      torneo_id: torneoId,
      equipo_id: input.equipoId,
      valor: input.valor,
      concepto: input.concepto,
      fecha: input.fecha,
    })
    if (r2.error) throw new Error(r2.error.message)
  }
}
