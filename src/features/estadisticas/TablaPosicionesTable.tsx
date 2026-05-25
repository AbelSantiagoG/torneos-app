import { useEffect, useMemo, useState } from 'react'
import { Columns3, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/common/EmptyState'
import { Trophy } from 'lucide-react'
import { displayImagePresets, resolveDisplayImageUrl } from '@/features/uploads/uploadService'
import { ordenarTablaPorCriterios, tablaPosicionRowsFromVista, type CriterioClasificacion, type VistaRow } from '@/features/estadisticas/estadisticasService'
import { AjustesTablaDialog } from '@/features/estadisticas/AjustesTablaDialog'
import type { TablaPosicionRow } from '@/features/estadisticas/tablaPosicionesService'
import { pickNum } from '@/features/_shared/supabaseHelpers'

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

type ColumnKey = 'pts' | 'pj' | 'pg' | 'pe' | 'pp' | 'gf' | 'gc' | 'dg' | 'fair_play' | 'amarillas' | 'rojas'

const COLUMN_STORAGE_KEY = 'estadisticas.tablaPosiciones.columnas'

const COLUMN_OPTIONS: { key: ColumnKey; label: string; short: string; className?: string }[] = [
  { key: 'pts', label: 'Puntos', short: 'PTS', className: 'font-semibold' },
  { key: 'pj', label: 'PJ / Juegos', short: 'PJ' },
  { key: 'pg', label: 'PG / Ganados', short: 'PG' },
  { key: 'pe', label: 'PE / Empates', short: 'PE' },
  { key: 'pp', label: 'PP / Perdidos', short: 'PP' },
  { key: 'gf', label: 'GF / Goles a favor', short: 'GF' },
  { key: 'gc', label: 'GC / Goles contra', short: 'GC' },
  { key: 'dg', label: 'DG / Diferencia de gol', short: 'DG' },
  { key: 'fair_play', label: 'Fair Play', short: 'Fair Play' },
  { key: 'amarillas', label: 'Amarillas', short: 'Amarillas' },
  { key: 'rojas', label: 'Rojas', short: 'Rojas' },
]

const DEFAULT_COLUMNS: ColumnKey[] = ['pts', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'fair_play']

function readColumnPrefs(): ColumnKey[] {
  if (typeof window === 'undefined') return DEFAULT_COLUMNS
  try {
    const parsed = JSON.parse(window.localStorage.getItem(COLUMN_STORAGE_KEY) || 'null') as ColumnKey[] | null
    const valid = new Set(COLUMN_OPTIONS.map((c) => c.key))
    const cols = Array.isArray(parsed) ? parsed.filter((key) => valid.has(key)) : []
    return cols.length ? cols : DEFAULT_COLUMNS
  } catch {
    return DEFAULT_COLUMNS
  }
}

export function TablaPosicionesTable({ rows, criterios, faseId, onRefresh }: Props) {
  const [editRow, setEditRow] = useState<TablaPosicionRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(() => readColumnPrefs())

  const sorted = ordenarTablaPorCriterios(rows, criterios)
  const tablaRows = tablaPosicionRowsFromVista(sorted).map((r, idx) => ({ ...r, posicion: idx + 1 }))
  const rowsForRender = useMemo(
    () => tablaRows.map((row, idx) => ({ row, raw: sorted[idx] ?? {} })),
    [tablaRows, sorted],
  )

  useEffect(() => {
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns])

  const visibleSet = new Set(visibleColumns)

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      if (prev.includes(key)) return prev.filter((col) => col !== key)
      const order = COLUMN_OPTIONS.map((col) => col.key)
      return [...prev, key].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    })
  }

  const valueForColumn = (row: TablaPosicionRow, raw: VistaRow, key: ColumnKey) => {
    if (key === 'pts') return row.pts
    if (key === 'pj') return row.pj
    if (key === 'pg') return row.pg
    if (key === 'pe') return row.pe
    if (key === 'pp') return row.pp
    if (key === 'gf') return row.gf
    if (key === 'gc') return row.gc
    if (key === 'dg') return row.dg
    if (key === 'fair_play') return row.fair_play
    if (key === 'amarillas') return pickNum(raw, 'amarillas', 'tarjetas_amarillas', 'ta')
    if (key === 'rojas') return pickNum(raw, 'rojas', 'tarjetas_rojas', 'tr')
    return 0
  }

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
        <div className="flex justify-end border-b bg-muted/20 p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Columns3 className="mr-2 h-4 w-4" />
                Columnas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-1 p-2">
                {COLUMN_OPTIONS.map((col) => (
                  <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                    <Checkbox
                      checked={visibleSet.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Pos</TableHead>
              <TableHead className="w-14 text-center">Escudo</TableHead>
              <TableHead>Equipo</TableHead>
              {COLUMN_OPTIONS.filter((col) => visibleSet.has(col.key)).map((col) => (
                <TableHead key={col.key} className="text-center">
                  {col.short}
                </TableHead>
              ))}
              <TableHead className="text-right">Ajustes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsForRender.map(({ row, raw }) => (
              <TableRow key={row.equipo_id}>
                <TableCell className="text-center font-medium">{row.posicion}</TableCell>
                <TableCell>
                  <TeamShield row={row} />
                </TableCell>
                <TableCell className="font-medium">{row.equipo_nombre}</TableCell>
                {COLUMN_OPTIONS.filter((col) => visibleSet.has(col.key)).map((col) => (
                  <TableCell key={col.key} className={`text-center tabular-nums ${col.className ?? ''}`}>
                    {valueForColumn(row, raw, col.key)}
                  </TableCell>
                ))}
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
