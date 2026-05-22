import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function parseDateOnlyParts(dateString: string): { year: number; month: number; day: number } | null {
  const value = dateString.trim().slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

export function getDateOnlyTime(dateString: string): number {
  const parts = parseDateOnlyParts(dateString)
  if (!parts) return Number.NaN
  return new Date(parts.year, parts.month - 1, parts.day).getTime()
}

export function formatDateOnly(dateString: string): string {
  const parts = parseDateOnlyParts(dateString)
  if (!parts) return dateString
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(parts.year, parts.month - 1, parts.day))
}

export function formatDate(dateString: string): string {
  if (parseDateOnlyParts(dateString)) return formatDateOnly(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatShortDate(dateString: string): string {
  const parts = parseDateOnlyParts(dateString)
  if (parts) {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(parts.year, parts.month - 1, parts.day))
  }
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateString))
}
