import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { translateUserError } from '@/lib/errorMessages'
import {
  calcularAjustesDesdeValoresFinales,
  upsertAjusteTablaPosiciones,
  type TablaPosicionRow,
} from '@/features/estadisticas/tablaPosicionesService'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  faseId: string
  row: TablaPosicionRow | null
  onSaved: () => void
}

export function AjustesTablaDialog({ open, onOpenChange, faseId, row, onSaved }: Props) {
  const [pj, setPj] = useState('0')
  const [pg, setPg] = useState('0')
  const [pe, setPe] = useState('0')
  const [pp, setPp] = useState('0')
  const [gf, setGf] = useState('0')
  const [gc, setGc] = useState('0')
  const [pts, setPts] = useState('0')
  const [fair, setFair] = useState('0')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!row || !open) return
    setPj(String(row.pj))
    setPg(String(row.pg))
    setPe(String(row.pe))
    setPp(String(row.pp))
    setGf(String(row.gf))
    setGc(String(row.gc))
    setPts(String(row.pts))
    setFair(String(row.fair_play))
    setObs('')
  }, [row, open])

  const guardar = async () => {
    if (!row || !faseId) return
    const final = {
      pj: Number(pj),
      pg: Number(pg),
      pe: Number(pe),
      pp: Number(pp),
      gf: Number(gf),
      gc: Number(gc),
      pts: Number(pts),
      fair_play: Number(fair),
    }
    const payload = {
      fase_torneo_id: faseId,
      equipo_id: row.equipo_id,
      observaciones: obs.trim() || null,
      ...calcularAjustesDesdeValoresFinales(final, row),
    }
    setSaving(true)
    try {
      await upsertAjusteTablaPosiciones(payload)
      toast.success('Ajuste de tabla guardado.')
      onOpenChange(false)
      onSaved()
    } catch (e) {
      console.error('Error en estadísticas', { payload, error: e })
      toast.error(translateUserError(e, 'programacion') || 'No se pudo guardar el ajuste de tabla.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar ajustes</DialogTitle>
          <DialogDescription>
            {row?.equipo_nombre ?? 'Equipo'} — los valores finales se guardan como ajuste sobre el cálculo base de la
            fase.
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-4">
            {(
              [
                ['PJ', pj, setPj],
                ['PG', pg, setPg],
                ['PE', pe, setPe],
                ['PP', pp, setPp],
                ['GF', gf, setGf],
                ['GC', gc, setGc],
                ['PTS', pts, setPts],
                ['Fair Play', fair, setFair],
              ] as const
            ).map(([label, val, set]) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <Input type="number" value={val} onChange={(e) => set(e.target.value)} />
              </div>
            ))}
            <div className="col-span-2 space-y-1 sm:col-span-4">
              <Label className="text-xs">Observaciones</Label>
              <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Motivo del ajuste" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => void guardar()} disabled={saving || !row}>
            {saving ? 'Guardando…' : 'Guardar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
