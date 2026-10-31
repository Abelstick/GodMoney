import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

const MINUS = String.fromCharCode(0x2212) // signo menos tipográfico: mismo ancho que "+" y no se confunde con un guion
const NBSP  = String.fromCharCode(0xa0) // el mismo espacio que pone Intl entre "S/" y la cifra (no deja cortar la línea)

const currencyFormatters = {}

// "S/ 1,234.56" · negativos como "−S/ 1,234.56"
export function formatCurrency(amount, currency = 'PEN') {
  currencyFormatters[currency] ??= new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currencyFormatters[currency].format(amount ?? 0).replace('-', MINUS)
}

// Siempre con signo: "+S/ 50.00" / "−S/ 50.00". `sign` fuerza el signo cuando
// el monto viene en positivo pero representa una salida (p. ej. un gasto).
export function formatSignedCurrency(amount, { sign } = {}) {
  const value = Number(amount ?? 0)
  const direction = sign ?? (value < 0 ? -1 : 1)
  if (value === 0 && sign === undefined) return formatCurrency(0)
  return (direction < 0 ? MINUS : '+') + formatCurrency(Math.abs(value))
}

// Para ejes de gráficos: "S/ 850", "S/ 1.2k", "S/ 15k"
export function formatCurrencyCompact(amount) {
  const value = Number(amount ?? 0)
  const abs = Math.abs(value)
  const prefix = (value < 0 ? MINUS : '') + 'S/' + NBSP
  if (abs >= 1000) {
    const k = abs / 1000
    return `${prefix}${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`
  }
  return `${prefix}${Math.round(abs)}`
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(date, 'd MMM yyyy', { locale: es })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(date, "d MMM yyyy, HH:mm", { locale: es })
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
