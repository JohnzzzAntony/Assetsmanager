// Utility functions for IT Asset Manager
import { format, formatDistanceToNow, differenceInDays, isValid } from 'date-fns'

export function formatDate(date?: string | Date | null, fmt = 'MMM d, yyyy'): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (!isValid(d)) return '—'
  return format(d, fmt)
}

export function formatDateTime(date?: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (!isValid(d)) return '—'
  return format(d, 'MMM d, yyyy h:mm a')
}

export function formatRelative(date?: string | Date | null): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (!isValid(d)) return '—'
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatCurrency(amount?: number | null, currency = 'USD'): string {
  if (amount === null || amount === undefined) return '—'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `$${amount.toFixed(2)}`
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function daysUntil(date?: string | Date | null): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (!isValid(d)) return null
  return differenceInDays(d, new Date())
}

export function warrantyStatus(date?: string | Date | null): {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  daysLeft: number | null
} {
  const days = daysUntil(date)
  if (days === null) return { label: 'No warranty', variant: 'secondary', daysLeft: null }
  if (days < 0) return { label: 'Expired', variant: 'destructive', daysLeft: days }
  if (days <= 30) return { label: `Expires in ${days}d`, variant: 'destructive', daysLeft: days }
  if (days <= 90) return { label: `${days}d left`, variant: 'outline', daysLeft: days }
  return { label: `${days}d left`, variant: 'default', daysLeft: days }
}

export function truncate(str: string, len: number): string {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function initials(name?: string): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function generateAssetTag(type?: string): string {
  const prefix = type ? type.slice(0, 2).toUpperCase() : 'AS'
  const num = Math.floor(Math.random() * 900000 + 100000)
  return `${prefix}-${num}`
}
