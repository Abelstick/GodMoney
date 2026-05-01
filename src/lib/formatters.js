import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatCurrency(amount, currency = 'PEN') {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(date, 'd MMM yyyy', { locale: es })
}

export function formatMonth(dateStr) {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(date, 'MMM yyyy', { locale: es })
}

export function getMonthRange(date = new Date()) {
  return {
    from: format(startOfMonth(date), 'yyyy-MM-dd'),
    to:   format(endOfMonth(date),   'yyyy-MM-dd'),
  }
}

export function getPastMonths(n = 6) {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const date = subMonths(new Date(), i)
    months.push({
      label: format(date, 'MMM', { locale: es }),
      year:  format(date, 'yyyy'),
      month: format(date, 'MM'),
      key:   format(date, 'yyyy-MM'),
      ...getMonthRange(date),
    })
  }
  return months
}

export function toInputDate(dateStr) {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(date, 'yyyy-MM-dd')
}

export function formatPercent(value, total) {
  if (!total || total === 0) return '0%'
  return `${Math.min(Math.round((value / total) * 100), 100)}%`
}

export function percentValue(value, total) {
  if (!total || total === 0) return 0
  return Math.min(Math.round((value / total) * 100), 100)
}
