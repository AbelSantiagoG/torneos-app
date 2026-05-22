import { useState } from 'react'
import { Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { Trophy } from 'lucide-react'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
import { ordenarTablaPorCriterios, tablaPosicionRowsFromVista, type CriterioClasificacion, type VistaRow } from '@/features/estadisticas/estadisticasService'
import { AjustesTablaDialog } from '@/features/estadisticas/AjustesTablaDialog'
import type { TablaPosicionRow } from '@/features/estadisticas/tablaPosicionesService'

function TeamShield({ row }: { row: TablaPosicionRow }) {
  const src = resolveDisplayImageUrl(row.logo_public_id, row.logo_url, displayImagePresets.equipoLogoThumb())
  if (src) {
    return <img src={src} alt="" className="mx-auto h-8 w-8 rounded-md border object-cover" />
  }
  const ph = (row.equipo_nombre || '?').slice(0, 2).toUpperCase()
  return (
    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold">
      {ph}
    </div>
  )
}

type Props = {
  rows: VistaRow[]
  criterios: CriterioClasificacion[]
  faseId: string
  onRefresh: () => void
}

export function TablaPosicionesTable({ rows, criterios, faseId, onRefresh }: Props) {
  const [editRow, setEditRow] = useState<TablaPosicionRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const sorted = ordenarTablaPorCriterios(rows, criterios)
  const tablaRows = tablaPosicionRowsFromVista(sorted).map((r, idx) => ({ ...r, posicion: idx + 1 }))

  if (!faseId) {
    return (
      <EmptyState icon={Trophy} title="Selecciona una fase" description="La tabla de posiciones se calcula por fase." />
    )
  }

  if (!tablaRows.length) {
    return (
      <EmptyState
        icon={Trophy}
        title="Sin datos de tabla"
        description="No hay partidos jugados en esta fase o aún no se generó la tabla."
      />
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Pos</TableHead>
              <TableHead className="w-14 text-center">Escudo</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead className="text-center">PJ</TableHead>
              <TableHead className="text-center">PG</TableHead>
              <TableHead className="text-center">PE</TableHead>
              <TableHead className="text-center">PP</TableHead>
              <TableHead className="text-center">GF</TableHead>
              <TableHead className="text-center">GC</TableHead>
              <TableHead className="text-center">DG</TableHead>
              <TableHead className="text-center">PTS</TableHead>
              <TableHead className="text-center">Fair Play</TableHead>
              <TableHead className="text-right">Ajustes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tablaRows.map((row) => (
              <TableRow key={row.equipo_id}>
                <TableCell className="text-center font-medium">{row.posicion}</TableCell>
                <TableCell>
                  <TeamShield row={row} />
                </TableCell>
                <TableCell className="font-medium">{row.equipo_nombre}</TableCell>
                <TableCell className="text-center tabular-nums">{row.pj}</TableCell>
                <TableCell className="text-center tabular-nums">{row.pg}</TableCell>
                <TableCell className="text-center tabular-nums">{row.pe}</TableCell>
                <TableCell className="text-center tabular-nums">{row.pp}</TableCell>
                <TableCell className="text-center tabular-nums">{row.gf}</TableCell>
                <TableCell className="text-center tabular-nums">{row.gc}</TableCell>
                <TableCell className="text-center tabular-nums">{row.dg}</TableCell>
                <TableCell className="text-center font-semibold tabular-nums">{row.pts}</TableCell>
                <TableCell className="text-center tabular-nums">{row.fair_play}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditRow(row)
                      setDialogOpen(true)
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar ajustes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AjustesTablaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        faseId={faseId}
        row={editRow}
        onSaved={onRefresh}
      />
    </>
  )
}
