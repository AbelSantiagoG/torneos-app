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
  getAjusteTablaPosiciones,
  upsertAjusteTablaPosiciones,
  type AjusteTablaPosicionesRow,
  type TablaPosicionRow,
} from '@/features/estadisticas/tablaPosicionesService'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  torneoId: string
  categoriaId: string
  faseId: string
  row: TablaPosicionRow | null
  onSaved: () => void
}

export function AjustesTablaDialog({ open, onOpenChange, torneoId, categoriaId, faseId, row, onSaved }: Props) {
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
  const [ajusteActual, setAjusteActual] = useState<AjusteTablaPosicionesRow | null>(null)

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
    setAjusteActual(null)
    setObs('')

    let alive = true
    void getAjusteTablaPosiciones(faseId, row.equipo_id).then((ajuste) => {
      if (!alive) return
      setAjusteActual(ajuste)
      setObs(ajuste?.observaciones ?? '')
    })
    return () => {
      alive = false
    }
  }, [faseId, row, open])

  const baseSinAjuste = row
    ? {
        pj_base: row.pj - (ajusteActual?.ajuste_pj ?? row.pj - row.pj_base),
        pg_base: row.pg - (ajusteActual?.ajuste_pg ?? row.pg - row.pg_base),
        pe_base: row.pe - (ajusteActual?.ajuste_pe ?? row.pe - row.pe_base),
        pp_base: row.pp - (ajusteActual?.ajuste_pp ?? row.pp - row.pp_base),
        gf_base: row.gf - (ajusteActual?.ajuste_gf ?? row.gf - row.gf_base),
        gc_base: row.gc - (ajusteActual?.ajuste_gc ?? row.gc - row.gc_base),
        pts_base: row.pts - (ajusteActual?.ajuste_pts ?? row.pts - row.pts_base),
        fair_play_base: row.fair_play - (ajusteActual?.ajuste_fairplay ?? row.fair_play - row.fair_play_base),
      }
    : null

  const guardar = async () => {
    if (!row || !faseId || !baseSinAjuste) return
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
      torneo_id: torneoId,
      categoria_id: categoriaId,
      fase_torneo_id: faseId,
      equipo_id: row.equipo_id,
      observaciones: obs.trim() || null,
      ...calcularAjustesDesdeValoresFinales(final, baseSinAjuste),
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
