import type { ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DataTableColumn<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  emptyMessage?: string
}

const TECHNICAL_COLUMN_RE =
  /(^id$|_id$|id$|_url$|url$|public_id$|_public_id$|^created_at$|^updated_at$|^deleted_at$|^color_|_color$|^logo_)/i

function isTechnicalColumn(key: string): boolean {
  return TECHNICAL_COLUMN_RE.test(key)
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'No hay datos disponibles.',
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((column) => !isTechnicalColumn(String(column.key)))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {visibleColumns.map((column) => (
            <TableHead key={String(column.key)}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={Math.max(visibleColumns.length, 1)} className="text-center text-muted-foreground py-8">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((item, index) => (
            <TableRow key={index}>
              {visibleColumns.map((column) => (
                <TableCell key={String(column.key)}>
                  {column.render ? column.render(item) : String(item[column.key as keyof T] ?? '-')}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
