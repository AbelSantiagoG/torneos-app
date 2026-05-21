import { useQuery } from '@tanstack/react-query'
import { Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { listMediaAssets, type MediaAssetTipo } from '@/features/media/mediaAssetsService'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'

const TIPO_LABEL: Record<MediaAssetTipo, string> = {
  torneo_logo: 'logos de torneo',
  equipo_logo: 'logos de equipo',
  jugador_foto: 'fotos de jugador',
}

function thumbOpts(tipo: MediaAssetTipo) {
  if (tipo === 'torneo_logo') return displayImagePresets.torneoLogo()
  if (tipo === 'equipo_logo') return displayImagePresets.equipoLogoThumb()
  return { width: 96, height: 96, crop: 'fill' as const, quality: 'auto' as const, format: 'auto' as const }
}

export type MediaAssetPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  torneoId: string | undefined
  tipo: MediaAssetTipo
  onSelect: (asset: { secure_url: string; public_id: string }) => void
}

export function MediaAssetPicker({ open, onOpenChange, torneoId, tipo, onSelect }: MediaAssetPickerProps) {
  const q = useQuery({
    queryKey: ['media-assets', torneoId, tipo],
    queryFn: () => listMediaAssets(torneoId!, tipo),
    enabled: open && Boolean(torneoId),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[200] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Biblioteca de imágenes
          </DialogTitle>
          <DialogDescription>
            Imágenes ya subidas para este torneo ({TIPO_LABEL[tipo]}). Elige una para reutilizarla.
          </DialogDescription>
        </DialogHeader>

        {!torneoId ? (
          <p className="text-sm text-muted-foreground">No hay torneo activo.</p>
        ) : q.isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        ) : q.isError ? (
          <p className="text-sm text-destructive">No se pudo cargar la biblioteca.</p>
        ) : !q.data?.length ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay imágenes registradas de este tipo. Sube una imagen nueva y quedará disponible aquí.
          </p>
        ) : (
          <ScrollArea className="max-h-[360px] pr-3">
            <div className="grid grid-cols-3 gap-2">
              {q.data.map((a) => {
                const src = resolveDisplayImageUrl(a.public_id, a.secure_url, thumbOpts(tipo))
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="group relative aspect-square overflow-hidden rounded-md border bg-muted ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      onSelect({ secure_url: a.secure_url, public_id: a.public_id })
                      onOpenChange(false)
                    }}
                  >
                    {src ? (
                      <img src={src} alt="" className="h-full w-full object-cover transition group-hover:opacity-90" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">?</div>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
