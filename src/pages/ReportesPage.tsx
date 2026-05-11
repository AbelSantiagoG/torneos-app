import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Reporte {
  id: string;
  titulo: string;
  descripcion: string;
  icono: React.ElementType;
  tipo: 'inscripciones' | 'fixture' | 'posiciones' | 'finanzas' | 'arbitrajes' | 'agenda';
  ultimaGeneracion?: string;
}

const reportes: Reporte[] = [
  {
    id: '1',
    titulo: 'Resumen de Inscripciones',
    descripcion: 'Lista completa de equipos inscritos por categoría con datos de contacto y estado de pago.',
    icono: Users,
    tipo: 'inscripciones',
    ultimaGeneracion: '2024-03-10',
  },
  {
    id: '2',
    titulo: 'Fixture Completo',
    descripcion: 'Programación completa de todos los partidos del torneo organizados por jornada y categoría.',
    icono: ClipboardList,
    tipo: 'fixture',
    ultimaGeneracion: '2024-03-12',
  },
  {
    id: '3',
    titulo: 'Agenda por Fecha',
    descripcion: 'Partidos programados agrupados por fecha con horarios, canchas y categorías.',
    icono: Calendar,
    tipo: 'agenda',
    ultimaGeneracion: '2024-03-14',
  },
  {
    id: '4',
    titulo: 'Tabla de Posiciones',
    descripcion: 'Clasificación actual de todos los equipos por categoría con estadísticas completas.',
    icono: Trophy,
    tipo: 'posiciones',
    ultimaGeneracion: '2024-03-15',
  },
  {
    id: '5',
    titulo: 'Estado Financiero',
    descripcion: 'Resumen de ingresos, egresos, cartera pendiente y balance general del torneo.',
    icono: DollarSign,
    tipo: 'finanzas',
    ultimaGeneracion: '2024-03-13',
  },
  {
    id: '6',
    titulo: 'Cuentas de Cobro',
    descripcion: 'Detalle de pagos pendientes por equipo con fechas de vencimiento y montos.',
    icono: FileSpreadsheet,
    tipo: 'finanzas',
    ultimaGeneracion: '2024-03-11',
  },
  {
    id: '7',
    titulo: 'Resumen de Arbitrajes',
    descripcion: 'Control de partidos arbitrados, pagos realizados y pendientes por árbitro.',
    icono: BarChart3,
    tipo: 'arbitrajes',
    ultimaGeneracion: '2024-03-14',
  },
];

export function ReportesPage() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handlePreview = (reporte: Reporte) => {
    setSelectedReporte(reporte);
    setPreviewOpen(true);
  };

  const handleExport = (reporte: Reporte) => {
    setSelectedReporte(reporte);
    setExportDialogOpen(true);
  };

  const getTipoBadgeColor = (tipo: Reporte['tipo']) => {
    const colors = {
      inscripciones: 'bg-blue-100 text-blue-800',
      fixture: 'bg-green-100 text-green-800',
      posiciones: 'bg-amber-100 text-amber-800',
      finanzas: 'bg-emerald-100 text-emerald-800',
      arbitrajes: 'bg-purple-100 text-purple-800',
      agenda: 'bg-cyan-100 text-cyan-800',
    };
    return colors[tipo];
  };

  const getTipoLabel = (tipo: Reporte['tipo']) => {
    const labels = {
      inscripciones: 'Inscripciones',
      fixture: 'Fixture',
      posiciones: 'Estadísticas',
      finanzas: 'Finanzas',
      arbitrajes: 'Arbitrajes',
      agenda: 'Agenda',
    };
    return labels[tipo];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Genera y exporta reportes del torneo en diferentes formatos"
      />

      {/* Acciones rápidas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Fixture
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Posiciones
            </Button>
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Compartir Agenda
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid de reportes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportes.map((reporte) => {
          const Icon = reporte.icono;
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
                <CardDescription className="text-sm">
                  {reporte.descripcion}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                {reporte.ultimaGeneracion && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Última generación: {new Date(reporte.ultimaGeneracion).toLocaleDateString('es-CO')}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handlePreview(reporte)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleExport(reporte)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de vista previa */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedReporte?.titulo}
            </DialogTitle>
            <DialogDescription>
              Vista previa del reporte
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[400px] rounded-lg border bg-muted/30 p-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-medium">Vista Previa del Reporte</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  El contenido del reporte se mostrará aquí cuando esté conectado a la base de datos.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="gap-2">
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de exportación */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Reporte</DialogTitle>
            <DialogDescription>
              Selecciona el formato de exportación para {selectedReporte?.titulo}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button variant="outline" className="justify-start gap-3 h-14">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-red-100">
                <FileText className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">PDF</div>
                <div className="text-xs text-muted-foreground">Documento portable</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-14">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-green-100">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Excel</div>
                <div className="text-xs text-muted-foreground">Hoja de cálculo editable</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start gap-3 h-14">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-green-100">
                <Share2 className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">WhatsApp</div>
                <div className="text-xs text-muted-foreground">Compartir enlace directo</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
