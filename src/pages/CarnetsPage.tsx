import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { toast } from 'sonner'
import { Printer, Download, Award, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'
import { useCategorias } from '@/features/categorias/useCategorias'
import { getEquiposByCategoria } from '@/features/equipos/equiposService'
import { getJugadoresByEquipo } from '@/features/jugadores/jugadoresService'
import {
  displayImagePresets,
  inlineRemoteImagesForCapture,
  resolveDisplayImageUrl,
} from '@/features/uploads/uploadService'

export function CarnetsPage() {
  const printRef = useRef<HTMLDivElement>(null)
  const [selectedCategoria, setSelectedCategoria] = useState('')
  const [selectedEquipo, setSelectedEquipo] = useState('')

  const { data: torneo, isLoading: torneoLoading, torneos } = useTorneoActivo()
  const torneoId = torneo?.id

  const { data: categorias = [], isLoading: catLoading } = useCategorias(torneoId)

  const equiposQuery = useQuery({
    queryKey: ['carnets-equipos', selectedCategoria],
    enabled: Boolean(selectedCategoria),
    queryFn: () => getEquiposByCategoria(selectedCategoria),
  })

  const jugadoresQuery = useQuery({
    queryKey: ['carnets-jugadores', selectedEquipo, selectedCategoria],
    enabled: Boolean(selectedEquipo && selectedCategoria),
    queryFn: () => getJugadoresByEquipo(selectedEquipo, selectedCategoria),
  })

  useEffect(() => {
    if (categorias.length && !selectedCategoria) setSelectedCategoria(categorias[0]!.id)
  }, [categorias, selectedCategoria])

  const equiposCategoria = equiposQuery.data ?? []
  const jugadores = jugadoresQuery.data ?? []
  const equipo = equiposCategoria.find((e) => e.id === selectedEquipo)
  const categoria = categorias.find((c) => c.id === selectedCategoria)

  const handlePrint = () => {
    window.print()
  }

  const handlePdf = async () => {
    if (!equipo || !torneo || jugadores.length === 0 || !printRef.current) return
    try {
      await inlineRemoteImagesForCapture(printRef.current)
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        onclone: (doc) => {
          const root = doc.querySelector('[data-carnets-pdf-root]')
          if (!root) return
          for (const el of Array.from(root.querySelectorAll('*'))) {
            el.removeAttribute('class')
          }
        },
      })
      const imgData = canvas.toDataURL('image/png')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 36
      const maxW = pageW - margin * 2
      const ratio = canvas.height / canvas.width
      let drawW = maxW
      let drawH = drawW * ratio
      if (drawH > pageH - margin * 2) {
        drawH = pageH - margin * 2
        drawW = drawH / ratio
      }
      const x = (pageW - drawW) / 2
      const y = margin
      doc.addImage(imgData, 'PNG', x, y, drawW, drawH)
      doc.save(`carnets-${equipo.nombre.replace(/\s+/g, '-')}.pdf`)
      toast.success('PDF descargado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo generar el PDF')
    }
  }

  if (!torneoLoading && torneos.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carnets de Jugadores" description="Vista previa de carnets" />
        <EmptyState
          icon={Award}
          title="Sin torneos"
          description="Crea un torneo primero para generar carnets con datos reales."
        />
      </div>
    )
  }

  if (torneoLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!torneoId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carnets de Jugadores" description="Vista previa de carnets" />
        <EmptyState icon={Award} title="Sin torneo activo" description="Activa un torneo para generar carnets." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        className="print:hidden"
        title="Carnets de Jugadores"
        description="Vista previa con datos reales de jugadores y equipos"
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={!selectedEquipo || jugadores.length === 0} onClick={handlePdf}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button type="button" disabled={!selectedEquipo || jugadores.length === 0} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        }
      />

      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <Label className="mb-2 block text-xs text-muted-foreground">Categoría</Label>
              {catLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : categorias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay categorías.</p>
              ) : (
                <Select
                  value={selectedCategoria}
                  onValueChange={(v) => {
                    setSelectedCategoria(v)
                    setSelectedEquipo('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.nombre} {cat.rangoEdad ? `(${cat.rangoEdad})` : ''}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex-1">
              <Label className="mb-2 block text-xs text-muted-foreground">Equipo</Label>
              <Select value={selectedEquipo} onValueChange={setSelectedEquipo} disabled={!selectedCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {equiposCategoria.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: eq.color }} />
                        {eq.nombre}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedEquipo ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={User}
              title="Selecciona un equipo"
              description="Elige una categoría y un equipo para ver la vista previa de los carnets."
            />
          </CardContent>
        </Card>
      ) : jugadoresQuery.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : jugadores.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={User}
              title="Sin jugadores activos"
              description="Este equipo no tiene jugadores con membresía activa en jugador_equipos."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: equipo?.color }} />
                {equipo?.nombre}
              </CardTitle>
              <CardDescription>{jugadores.length} carnets</CardDescription>
            </CardHeader>
          </Card>

          <div
            ref={printRef}
            data-carnets-pdf-root
            className="grid gap-6 rounded-xl border bg-slate-50 p-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            style={{ background: '#f8fafc', borderColor: '#e5e7eb', color: '#111827' }}
          >
            {jugadores.map((jugador) => {
              const torneoLogoSrc = resolveDisplayImageUrl(
                torneo.logo_public_id,
                torneo.logo_url,
                displayImagePresets.torneoLogo(),
              )
              const equipoLogoSrc = resolveDisplayImageUrl(
                equipo?.logoPublicId,
                equipo?.logoUrl,
                displayImagePresets.equipoLogo(),
              )
              const jugadorFotoSrc = resolveDisplayImageUrl(
                jugador.fotoPublicId,
                jugador.fotoUrl,
                displayImagePresets.jugadorFotoCarnet(),
              )
              return (
              <Card
                key={jugador.id}
                className="h-[340px] overflow-hidden border-0 shadow-lg ring-1 ring-slate-200"
                style={{ height: 340, overflow: 'hidden', background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 12 }}
              >
                <div className="h-1.5" style={{ background: '#334155' }} />
                <CardContent className="flex h-[334px] flex-col gap-3 p-5" style={{ display: 'flex', height: 334, flexDirection: 'column', gap: 12, padding: 20, background: '#ffffff', color: '#111827' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {torneoLogoSrc ? (
                        <img src={torneoLogoSrc} alt="" className="h-10 w-10 rounded-full border object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
                          {torneo?.nombre?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[115px] truncate text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>
                          {torneo?.nombre}
                        </p>
                        <p className="max-w-[115px] truncate text-xs" style={{ color: '#475569' }}>{categoria?.nombre}</p>
                      </div>
                    </div>
                    {equipoLogoSrc ? (
                      <img src={equipoLogoSrc} alt="" className="h-9 w-9 rounded-md border object-cover" />
                    ) : (
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-md text-[10px] font-bold text-white"
                        style={{ backgroundColor: equipo?.color }}
                      >
                        {equipo?.logoPlaceholder}
                      </div>
                    )}
                  </div>

                  <div className="mx-auto flex h-28 w-24 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-inner">
                    {jugadorFotoSrc ? (
                      <img src={jugadorFotoSrc} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <User className="h-12 w-12 text-slate-300" />
                    )}
                  </div>

                  <div className="text-center">
                    <h3
                      className="line-clamp-2 min-h-[44px] text-lg font-bold leading-5 tracking-tight"
                      title={jugador.nombre}
                      style={{ color: '#111827' }}
                    >
                      {jugador.nombre}
                    </h3>
                    <p className="truncate text-xs font-medium" title={equipo?.nombre} style={{ color: '#64748b' }}>
                      {equipo?.nombre}
                    </p>
                  </div>

                  <div className="mt-auto space-y-1.5 rounded-lg px-3 py-2 text-xs" style={{ background: '#f1f5f9', color: '#111827' }}>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: '#64748b' }}>Documento</span>
                      <span className="max-w-[110px] truncate font-semibold" title={jugador.documento} style={{ color: '#1f2937' }}>{jugador.documento}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Año nac.</span>
                      <span className="font-semibold text-slate-800">{jugador.anioNacimiento}</span>
                    </div>
                  </div>
                </CardContent>
                <div className="h-1" style={{ backgroundColor: equipo?.color }} />
              </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
