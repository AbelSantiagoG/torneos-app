import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  fetchImageAsDataUrl,
  resolveDisplayImageUrl,
} from '@/features/uploads/uploadService'
import { formatDateOnly } from '@/lib/utils'

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
    if (!equipo || !torneo || jugadores.length === 0) return
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const margin = 32
      const gap = 18
      const cardW = 250
      const cardH = 158
      const cols = 2
      const rowsPerPage = Math.floor((pageH - margin * 2 + gap) / (cardH + gap))
      const x0 = (pageW - cols * cardW - (cols - 1) * gap) / 2

      const torneoLogoSrc = resolveDisplayImageUrl(torneo.logo_public_id, torneo.logo_url, displayImagePresets.torneoLogo())
      const equipoLogoSrc = resolveDisplayImageUrl(equipo.logoPublicId, equipo.logoUrl, displayImagePresets.equipoLogo())
      const [torneoLogoData, equipoLogoData] = await Promise.all([
        torneoLogoSrc ? fetchImageAsDataUrl(torneoLogoSrc) : Promise.resolve(null),
        equipoLogoSrc ? fetchImageAsDataUrl(equipoLogoSrc) : Promise.resolve(null),
      ])

      const drawDataImage = (dataUrl: string | null, x: number, y: number, w: number, h: number) => {
        if (!dataUrl) return false
        const format = dataUrl.includes('image/png') ? 'PNG' : 'JPEG'
        doc.addImage(dataUrl, format, x, y, w, h)
        return true
      }

      const drawInitials = (text: string, x: number, y: number, w: number, h: number, fill = '#0f172a') => {
        doc.setFillColor(fill)
        doc.roundedRect(x, y, w, h, 8, 8, 'F')
        doc.setTextColor('#ffffff')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text((text || '?').slice(0, 2).toUpperCase(), x + w / 2, y + h / 2 + 4, { align: 'center' })
      }

      for (let i = 0; i < jugadores.length; i += 1) {
        const slot = i % (cols * rowsPerPage)
        if (i > 0 && slot === 0) doc.addPage()
        const col = slot % cols
        const row = Math.floor(slot / cols)
        const x = x0 + col * (cardW + gap)
        const y = margin + row * (cardH + gap)
        const jugador = jugadores[i]!
        const jugadorFotoSrc = resolveDisplayImageUrl(jugador.fotoPublicId, jugador.fotoUrl, displayImagePresets.jugadorFotoCarnet())
        const jugadorFotoData = jugadorFotoSrc ? await fetchImageAsDataUrl(jugadorFotoSrc) : null

        doc.setFillColor('#ffffff')
        doc.roundedRect(x, y, cardW, cardH, 12, 12, 'F')
        doc.setDrawColor('#e5e7eb')
        doc.roundedRect(x, y, cardW, cardH, 12, 12, 'S')
        doc.setFillColor(equipo.color || '#0f172a')
        doc.rect(x, y, 8, cardH, 'F')

        if (!drawDataImage(torneoLogoData, x + 102, y + 18, 24, 24)) drawInitials(torneo.nombre, x + 102, y + 18, 24, 24)
        if (!drawDataImage(equipoLogoData, x + cardW - 42, y + 18, 24, 24)) {
          drawInitials(equipo.logoPlaceholder || equipo.nombre, x + cardW - 42, y + 18, 24, 24, equipo.color || '#0f172a')
        }

        doc.setTextColor('#64748b')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.text(String(torneo.nombre).slice(0, 24).toUpperCase(), x + 132, y + 28, { maxWidth: 72 })
        doc.setFont('helvetica', 'normal')
        doc.text(String(equipo.nombre ?? '').slice(0, 28), x + 102, y + 48, { maxWidth: cardW - 120 })

        const photoX = x + 20
        const photoY = y + 42
        doc.setDrawColor('#e2e8f0')
        doc.roundedRect(photoX, photoY, 72, 88, 10, 10, 'S')
        if (!drawDataImage(jugadorFotoData, photoX + 2, photoY + 2, 68, 84)) {
          drawInitials(jugador.nombre, photoX + 2, photoY + 2, 68, 84, '#e2e8f0')
          doc.setTextColor('#334155')
        }

        doc.setTextColor('#111827')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(jugador.nombre.length > 30 ? 10 : 12)
        const nameLines = doc.splitTextToSize(jugador.nombre, cardW - 124).slice(0, 2)
        doc.text(nameLines, x + 112, y + 76)
        doc.setTextColor('#64748b')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.text(String(categoria?.nombre ?? '').slice(0, 28), x + 112, y + 98, { maxWidth: cardW - 130 })

        doc.setFillColor('#f1f5f9')
        doc.roundedRect(x + 112, y + 110, cardW - 130, 32, 8, 8, 'F')
        doc.setTextColor('#64748b')
        doc.setFontSize(8)
        doc.text('Documento', x + 120, y + 123)
        doc.text('Nacimiento', x + 120, y + 137)
        doc.setTextColor('#1f2937')
        doc.setFont('helvetica', 'bold')
        doc.text(String(jugador.documento).slice(0, 18), x + cardW - 12, y + 123, { align: 'right' })
        doc.text(formatDateOnly(jugador.fechaNacimiento ?? ''), x + cardW - 12, y + 137, { align: 'right' })
      }
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
            className="grid gap-6 rounded-xl border bg-slate-50 p-6 md:grid-cols-2 xl:grid-cols-3"
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
                className="aspect-[1.586/1] overflow-hidden border-0 shadow-lg ring-1 ring-slate-200"
                style={{ aspectRatio: '1.586 / 1', overflow: 'hidden', background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 14 }}
              >
                <CardContent className="grid h-full grid-cols-[96px_minmax(0,1fr)] gap-4 p-4" style={{ display: 'grid', height: '100%', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 16, padding: 16, background: '#ffffff', color: '#111827' }}>
                  <div className="flex min-w-0 flex-col items-center gap-2">
                    <div className="flex w-full items-center justify-between gap-2">
                      {torneoLogoSrc ? (
                        <img src={torneoLogoSrc} alt="" className="h-7 w-7 rounded-full border object-cover" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                          {torneo?.nombre?.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {equipoLogoSrc ? (
                        <img src={equipoLogoSrc} alt="" className="h-7 w-7 rounded-md border object-cover" />
                      ) : (
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold text-white"
                          style={{ backgroundColor: equipo?.color }}
                        >
                          {equipo?.logoPlaceholder}
                        </div>
                      )}
                    </div>
                  <div className="flex h-[118px] w-[88px] items-center justify-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-inner">
                    {jugadorFotoSrc ? (
                      <img src={jugadorFotoSrc} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <User className="h-12 w-12 text-slate-300" />
                    )}
                  </div>
                  </div>

                  <div className="flex min-w-0 flex-col">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: '#64748b' }}>
                      {torneo?.nombre}
                    </p>
                    <h3
                      className="line-clamp-2 min-h-[44px] text-lg font-bold leading-5 tracking-tight"
                      title={jugador.nombre}
                      style={{ color: '#111827' }}
                    >
                      {jugador.nombre}
                    </h3>

                  <div className="mt-auto space-y-1.5 rounded-lg px-3 py-2 text-xs" style={{ background: '#f1f5f9', color: '#111827' }}>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: '#64748b' }}>Documento</span>
                      <span className="max-w-[110px] truncate font-semibold" title={jugador.documento} style={{ color: '#1f2937' }}>{jugador.documento}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Nacimiento</span>
                      <span className="font-semibold text-slate-800">{formatDateOnly(jugador.fechaNacimiento ?? '')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Categoría</span>
                      <span className="max-w-[120px] truncate font-semibold text-slate-800" title={categoria?.nombre}>{categoria?.nombre}</span>
                    </div>
                  </div>
                  </div>
                </CardContent>
              </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

