import { supabase } from '@/lib/supabase'
import { asRow, pickNum, pickStr, throwOnError } from '@/features/_shared/supabaseHelpers'
import type { ResumenFinancieroUi } from '@/features/dashboard/dashboardService'
import { toFriendlyError } from '@/lib/errorMessages'

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
    resultado: pickNum(row, 'resultado_neto', 'resultado', 'balance'),
  }
}

export async function fetchResumenFinanciero(torneoId: string): Promise<ResumenFinancieroUi> {
  const r = await supabase.from('vw_resumen_financiero').select('*').eq('torneo_id', torneoId).maybeSingle()
  if (!r.error && r.data) return mapResumenFromRow(asRow(r.data))
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
  return []
}

function mapCarteraVwRow(row: Record<string, unknown>): CarteraRowUi {
  const valorInscripcion = pickNum(row, 'valor_total', 'valor_inscripcion', 'valor_esperado', 'monto_esperado')
  const totalAbonado = pickNum(row, 'valor_abonado', 'total_abonado', 'abonado', 'monto_pagado', 'cobrado')
  const saldo = pickNum(row, 'saldo', 'saldo_pendiente', 'pendiente') || Math.max(0, valorInscripcion - totalAbonado)
  let estado: CarteraRowUi['estado'] = 'pendiente'
  if (saldo <= 0) estado = 'al_dia'
  else if (totalAbonado <= 0) estado = 'vencido'

  return {
    equipoId: pickStr(row, 'equipo_id', 'id_equipo'),
    equipoNombre: pickStr(row, 'equipo', 'equipo_nombre', 'nombre_equipo'),
    equipoColor: pickStr(row, 'color', 'equipo_color') || '#64748b',
    categoriaId: pickStr(row, 'categoria_id'),
    categoriaNombre: pickStr(row, 'categoria', 'categoria_nombre', 'nombre_categoria'),
    categoriaColor: pickStr(row, 'categoria_color') || '#64748b',
    valorInscripcion,
    totalAbonado,
    saldo,
    estado,
    pagoInscripcionId: pickStr(row, 'pago_inscripcion_id', 'id_pago_inscripcion') || null,
  }
}

export async function fetchCarteraRows(torneoId: string): Promise<CarteraRowUi[]> {
  const v = await supabase.from('vw_cartera').select('*').eq('torneo_id', torneoId)
  if (!v.error && v.data?.length) {
    return (v.data as Record<string, unknown>[]).map(mapCarteraVwRow)
  }
  return buildCarteraFromTables(torneoId)
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
        ? pickNum(pago.row, 'valor_total', 'valor_esperado', 'monto_esperado', 'valor_inscripcion', 'monto_total') ||
          valor
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
  if (r.error) throw toFriendlyError(r.error, 'finanzas')
  return []
}

function mapEgresoRow(row: Record<string, unknown>): EgresoRow {
  const fecha = pickStr(row, 'fecha', 'fecha_gasto', 'created_at').slice(0, 10)
  const catRaw = row.categoria ?? row.categoria_gasto ?? row.categoriaGasto
  return {
    id: pickStr(row, 'id'),
    fecha: fecha || pickStr(row, 'created_at').slice(0, 10),
    concepto: pickStr(row, 'concepto', 'descripcion'),
    categoriaGasto: catRaw != null ? String(catRaw) : '',
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
  observaciones?: string | null
  soporteUrl?: string | null
}

/** Valores enum `categoria_gasto` en Postgres (coinciden con RPC). */
export type CategoriaGastoDb =
  | 'infraestructura'
  | 'material_deportivo'
  | 'premiacion'
  | 'administrativo'
  | 'eventos'
  | 'arbitraje'
  | 'otro'

export function mapUiCategoriaGastoToDb(ui: string): CategoriaGastoDb {
  const v = ui.trim().toLowerCase()
  const map: Record<string, CategoriaGastoDb> = {
    infraestructura: 'infraestructura',
    material: 'material_deportivo',
    material_deportivo: 'material_deportivo',
    premiacion: 'premiacion',
    administrativo: 'administrativo',
    eventos: 'eventos',
    arbitraje: 'arbitraje',
    otros: 'otro',
    otro: 'otro',
  }
  return map[v] ?? 'otro'
}

export async function createEgreso(torneoId: string, input: EgresoInput): Promise<void> {
  const categoria = mapUiCategoriaGastoToDb(input.categoriaGasto)
  const { error } = await supabase.rpc('crear_egreso_seguro', {
    p_torneo_id: torneoId,
    p_fecha: input.fecha,
    p_concepto: input.concepto,
    p_categoria: categoria,
    p_valor: input.valor,
    p_responsable: input.responsable || null,
    p_observaciones: input.observaciones ?? null,
    p_soporte_url: input.soporteUrl ?? null,
  })
  if (error) throw toFriendlyError(error, 'finanzas')
}

export async function updateEgreso(id: string, input: Partial<EgresoInput>): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (input.fecha !== undefined) patch.fecha = input.fecha
  if (input.concepto !== undefined) patch.concepto = input.concepto
  if (input.valor !== undefined) patch.valor = input.valor
  if (input.categoriaGasto !== undefined) patch.categoria = mapUiCategoriaGastoToDb(input.categoriaGasto)
  if (input.responsable !== undefined) patch.responsable = input.responsable
  if (input.observaciones !== undefined) patch.observaciones = input.observaciones
  if (input.soporteUrl !== undefined) patch.soporte_url = input.soporteUrl

  const r = await supabase.from('egresos').update(patch).eq('id', id)
  if (r.error) throw toFriendlyError(r.error, 'finanzas')
}

export async function deleteEgreso(id: string): Promise<void> {
  const r = await supabase.from('egresos').delete().eq('id', id)
  if (r.error) throw toFriendlyError(r.error, 'finanzas')
}

export type AbonoInput = {
  equipoId: string
  valor: number
  concepto?: string
  fecha: string
  pagoInscripcionId?: string | null
  medioPago?: string
  referencia?: string | null
  observaciones?: string | null
}

export async function createAbono(_torneoId: string, input: AbonoInput): Promise<void> {
  let pagoId = input.pagoInscripcionId ?? null
  if (!pagoId) {
    const p = await supabase.from('pagos_inscripcion').select('id').eq('equipo_id', input.equipoId).maybeSingle()
    if (!p.error && p.data) pagoId = (p.data as { id: string }).id
  }
  if (!pagoId) {
    throw new Error(
      'Este equipo no tiene registro de inscripción para cobrar. Si acabas de crear el equipo, recarga la página; si el problema continúa, revisa en Supabase la tabla pagos_inscripcion.',
    )
  }

  const medio = (input.medioPago ?? 'efectivo').toLowerCase()
  const obs = [input.concepto, input.observaciones].filter(Boolean).join(' — ') || null

  const { error } = await supabase.rpc('registrar_abono_seguro', {
    p_pago_inscripcion_id: pagoId,
    p_valor: input.valor,
    p_fecha_pago: input.fecha,
    p_medio_pago: medio,
    p_referencia: input.referencia ?? null,
    p_observaciones: obs,
  })
  if (error) throw toFriendlyError(error, 'finanzas')
}
