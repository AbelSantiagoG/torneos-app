import { supabase } from '@/lib/supabase'
import { pickStr } from '@/features/_shared/supabaseHelpers'

export type ReporteGeneradoRow = {
  id: string
  titulo: string
  tipo: string | null
  created_at: string
  url: string | null
  estado: string | null
}

function mapReporteRow(row: Record<string, unknown>): ReporteGeneradoRow {
  return {
    id: pickStr(row, 'id'),
    titulo: pickStr(row, 'titulo', 'nombre', 'tipo_reporte', 'tipo'),
    tipo: pickStr(row, 'tipo', 'tipo_reporte') || null,
    created_at: pickStr(row, 'created_at', 'fecha_generacion', 'generado_en'),
    url: pickStr(row, 'url', 'archivo_url', 'file_url') || null,
    estado: pickStr(row, 'estado') || null,
  }
}

export async function listReportesGenerados(torneoId: string): Promise<ReporteGeneradoRow[]> {
  const r = await supabase
    .from('reportes_generados')
    .select('*')
    .eq('torneo_id', torneoId)
    .order('created_at', { ascending: false })

  if (!r.error && r.data) {
    return (r.data as Record<string, unknown>[]).map(mapReporteRow)
  }

  const r2 = await supabase.from('reportes_generados').select('*').order('created_at', { ascending: false })
  if (r2.error) return []
  const rows = r2.data as Record<string, unknown>[]
  return rows.filter((row) => pickStr(row, 'torneo_id') === torneoId).map(mapReporteRow)
}
