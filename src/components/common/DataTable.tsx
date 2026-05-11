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

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'No hay datos disponibles.',
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={String(column.key)}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
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
