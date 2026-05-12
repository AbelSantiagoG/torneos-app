import { useState } from 'react'
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
import { useTorneoActivo } from '@/features/torneos/useTorneoActivo'

type CrearTorneoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CrearTorneoDialog({ open, onOpenChange }: CrearTorneoDialogProps) {
  const { crearTorneo, isCreatingTorneo } = useTorneoActivo()
  const [nombre, setNombre] = useState('')
  const [organizacion, setOrganizacion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre del torneo es obligatorio.')
      return
    }
    if (!organizacion.trim()) {
      toast.error('La organización es obligatoria.')
      return
    }
    try {
      await crearTorneo({
        nombre: nombre.trim(),
        organizacion: organizacion.trim(),
        fecha_inicio: fechaInicio.trim() || null,
        fecha_fin: fechaFin.trim() || null,
        descripcion: descripcion.trim() || null,
      })
      toast.success('Torneo creado correctamente.')
      setNombre('')
      setOrganizacion('')
      setFechaInicio('')
      setFechaFin('')
      setDescripcion('')
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo crear el torneo.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo torneo</DialogTitle>
          <DialogDescription>
            Se creará el torneo en Supabase mediante la función crear_torneo_con_base.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="ct-nombre">Nombre</Label>
            <Input id="ct-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Copa 2026" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-org">Organización</Label>
            <Input
              id="ct-org"
              value={organizacion}
              onChange={(e) => setOrganizacion(e.target.value)}
              placeholder="Club o liga"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ct-ini">Fecha inicio</Label>
              <Input id="ct-ini" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-fin">Fecha fin</Label>
              <Input id="ct-fin" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-desc">Descripción (opcional)</Label>
            <Input id="ct-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isCreatingTorneo}>
            {isCreatingTorneo ? 'Creando…' : 'Crear torneo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
