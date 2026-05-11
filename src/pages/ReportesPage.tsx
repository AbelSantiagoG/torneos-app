import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Calendar,
  Trophy,
  DollarSign,
  Users,
  ClipboardList,
  Download,
  Eye,
  Share2,
  Printer,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { listReportesGenerados } from '@/features/reportes/reportesService'

interface ReporteCatalogo {
  id: string
  titulo: string
  descripcion: string
  icono: React.ElementType
  tipo: 'inscripciones' | 'fixture' | 'posiciones' | 'finanzas' | 'arbitrajes' | 'agenda'
}

const reportesCatalogo: ReporteCatalogo[] = [
  {
    id: '1',
    titulo: 'Resumen de Inscripciones',
    descripcion: 'Lista de equipos inscritos por categoría y estado de pago.',
    icono: Users,
    tipo: 'inscripciones',
  },
  {
    id: '2',
    titulo: 'Fixture Completo',
    descripcion: 'Programación de partidos por jornada y categoría.',
    icono: ClipboardList,
    tipo: 'fixture',
  },
  {
    id: '3',
    titulo: 'Agenda por Fecha',
    descripcion: 'Partidos agrupados por fecha con horarios y canchas.',
    icono: Calendar,
    tipo: 'agenda',
  },
  {
    id: '4',
    titulo: 'Tabla de Posiciones',
    descripcion: 'Clasificación por categoría según datos del torneo.',
    icono: Trophy,
    tipo: 'posiciones',
  },
  {
    id: '5',
    titulo: 'Estado Financiero',
    descripcion: 'Ingresos, egresos y cartera.',
    icono: DollarSign,
    tipo: 'finanzas',
  },
  {
    id: '6',
    titulo: 'Cuentas de Cobro',
    descripcion: 'Detalle de saldos por equipo.',
    icono: FileSpreadsheet,
    tipo: 'finanzas',
  },
  {
    id: '7',
    titulo: 'Resumen de Arbitrajes',
    descripcion: 'Partidos arbitrados y pagos.',
    icono: BarChart3,
    tipo: 'arbitrajes',
  },
]

export function ReportesPage() {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedReporte, setSelectedReporte] = useState<ReporteCatalogo | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const { data: torneo, isLoading: torneoLoading } = useTorneoActivo()
  const torneoId = torneo?.id

  const historialQ = useQuery({
    queryKey: ['reportes-historial', torneoId],
    enabled: Boolean(torneoId),
    queryFn: () => listReportesGenerados(torneoId!),
  })

  const handlePreview = (reporte: ReporteCatalogo) => {
    setSelectedReporte(reporte)
    setPreviewOpen(true)
  }

  const handleExport = (reporte: ReporteCatalogo) => {
    setSelectedReporte(reporte)
    setExportDialogOpen(true)
  }

  const getTipoBadgeColor = (tipo: ReporteCatalogo['tipo']) => {
    const colors = {
      inscripciones: 'bg-blue-100 text-blue-800',
      fixture: 'bg-green-100 text-green-800',
      posiciones: 'bg-amber-100 text-amber-800',
      finanzas: 'bg-emerald-100 text-emerald-800',
      arbitrajes: 'bg-purple-100 text-purple-800',
      agenda: 'bg-cyan-100 text-cyan-800',
    }
    return colors[tipo]
  }

  const getTipoLabel = (tipo: ReporteCatalogo['tipo']) => {
    const labels = {
      inscripciones: 'Inscripciones',
      fixture: 'Fixture',
      posiciones: 'Estadísticas',
      finanzas: 'Finanzas',
      arbitrajes: 'Arbitrajes',
      agenda: 'Agenda',
    }
    return labels[tipo]
  }

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reportes" description="Generación y exportación" />
        <EmptyState icon={FileText} title="Sin torneo activo" description="Activa un torneo para asociar reportes." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Plantillas de reporte; fechas solo desde reportes_generados" />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Historial en Supabase</CardTitle>
          <CardDescription>Tabla reportes_generados (si existe y hay RLS adecuado)</CardDescription>
        </CardHeader>
        <CardContent>
          {historialQ.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (historialQ.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin reportes generados"
              description="Cuando existan filas en reportes_generados, verás aquí la fecha real de generación."
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {historialQ.data!.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span className="font-medium">{r.titulo || r.tipo || 'Reporte'}</span>
                  <span className="text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleString('es-CO') : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" disabled>
              <Printer className="h-4 w-4" />
              Imprimir Fixture
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <Download className="h-4 w-4" />
              Exportar Posiciones
            </Button>
            <Button variant="outline" className="gap-2" disabled>
              <Share2 className="h-4 w-4" />
              Compartir Agenda
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportesCatalogo.map((reporte) => {
          const Icon = reporte.icono
          return (
            <Card key={reporte.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className={getTipoBadgeColor(reporte.tipo)}>
                    {getTipoLabel(reporte.tipo)}
                  </Badge>
                </div>
                <CardTitle className="mt-3 text-lg">{reporte.titulo}</CardTitle>
                <CardDescription className="text-sm">{reporte.descripcion}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <p className="mb-3 text-xs text-muted-foreground">
                  La exportación PDF/Excel se conectará a datos reales en una siguiente fase.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handlePreview(reporte)}>
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleExport(reporte)}>
                    <Download className="h-3.5 w-3.5" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1" disabled>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedReporte?.titulo}
            </DialogTitle>
            <DialogDescription>Vista previa (sin datos mock)</DialogDescription>
          </DialogHeader>
          <div className="min-h-[320px] rounded-lg border bg-muted/30 p-6">
            <EmptyState
              icon={FileText}
              title="Vista previa"
              description="El contenido se generará desde Supabase cuando el motor de reportes esté conectado."
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Reporte</DialogTitle>
            <DialogDescription>Formato para {selectedReporte?.titulo} (pendiente)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button variant="outline" className="h-14 justify-start gap-3" disabled>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" className="h-14 justify-start gap-3" disabled>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
