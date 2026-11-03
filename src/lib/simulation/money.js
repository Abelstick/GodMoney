// Aritmética monetaria del simulador: todo se calcula en céntimos enteros para
// que sumar cientos de movimientos no acumule errores de coma flotante
// (0.1 + 0.2 ≠ 0.3). Solo se convierte a soles al presentar.

const AMOUNT_RE = /^([+-])?(\d*)(?:\.(\d*))?$/

// "1,234.56" | "12.5" | 12.5 → 123456 | 1250 | 1250. Más de dos decimales se
// redondean (mitad hacia arriba, en valor absoluto). Inválido → 0.
export function toCents(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0
    // toFixed(3) fija la representación decimal antes de redondear a céntimos
    // (12.345 → "12.345", no 12.344999…).
    return toCents(value.toFixed(3))
  }
  const text = String(value).trim().replace(/,/g, '')
  const match = text.match(AMOUNT_RE)
  if (!match || (!match[2] && !match[3])) return 0
  const sign = match[1] === '-' ? -1 : 1
  const whole = Number(match[2] || '0')
  const decimals = (match[3] ?? '').padEnd(3, '0')
  let cents = whole * 100 + Number(decimals.slice(0, 2))
  if (Number(decimals[2]) >= 5) cents += 1
  return sign * cents
}

export const fromCents = (cents) => cents / 100

// ¿Es un monto válido y mayor que cero para un movimiento?
export function isPositiveAmount(value) {
  if (value === null || value === undefined || value === '') return false
  const text = String(value).trim().replace(/,/g, '')
  return AMOUNT_RE.test(text) && !text.startsWith('-') && toCents(text) > 0
}

// Porcentaje con un decimal, sin pasar por flotantes intermedios raros.
export function percentOf(part, total) {
  if (!total || total <= 0) return null
  return Math.round((part * 1000) / total) / 10
}
