// Interpretación de extractos bancarios / CSV de movimientos.

const HEADER_HINTS = {
  date:        ['fecha', 'date', 'f. operacion', 'f. operación', 'fecha operacion', 'fecha operación', 'f.valor'],
  description: ['descripcion', 'descripción', 'detalle', 'concepto', 'description', 'glosa', 'movimiento', 'referencia'],
  amount:      ['monto', 'importe', 'amount', 'valor'],
  debit:       ['cargo', 'debito', 'débito', 'retiro', 'egreso', 'debit'],
  credit:      ['abono', 'credito', 'crédito', 'deposito', 'depósito', 'ingreso', 'credit'],
}

const norm = (s) => String(s ?? '').trim().toLowerCase()

/** Adivina qué columna es cada campo según los encabezados. Devuelve índices o -1. */
export function guessMapping(headers) {
  const find = (hints) => headers.findIndex((h) => hints.some((k) => norm(h).includes(k)))
  const mapping = {
    date: find(HEADER_HINTS.date),
    description: find(HEADER_HINTS.description),
    amount: find(HEADER_HINTS.amount),
    debit: find(HEADER_HINTS.debit),
    credit: find(HEADER_HINTS.credit),
  }
  const mode = mapping.amount < 0 && mapping.debit >= 0 && mapping.credit >= 0 ? 'split' : 'signed'
  return { mapping, mode }
}

/** Acepta dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, yyyy/mm/dd, dd/mm/yy. Devuelve 'yyyy-MM-dd' o null. */
export function parseDate(raw) {
  const s = String(raw ?? '').trim().split(/[ T]/)[0]
  let y, m, d
  let match = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (match) [, y, m, d] = match
  else if ((match = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
    [, d, m, y] = match
    if (y.length === 2) y = `20${y}`
  } else return null

  const yy = Number(y), mm = Number(m), dd = Number(d)
  const date = new Date(yy, mm - 1, dd)
  if (date.getFullYear() !== yy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return null
  return `${String(yy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

/**
 * Convierte "1,234.56", "1.234,56", "S/ 12.50", "(12.50)", "-12.50", "12.50-" a número.
 * Devuelve null si no hay número válido.
 */
export function parseAmount(raw) {
  let s = String(raw ?? '').trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  if (s.includes('-')) negative = true // "-12.50", "12.50-", "S/ -12.50"
  s = s.replace(/[^\d.,]/g, '')
  if (!s) return null

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastDot >= 0 && lastComma >= 0) {
    // El último separador es el decimal
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma >= 0) {
    // "12,50" decimal; "1,234" (3 dígitos tras la coma) millares
    s = /,\d{3}$/.test(s) && s.indexOf(',') === lastComma ? s.replace(',', '') : s.replace(',', '.')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negative ? -n : n
}

export const normalizeText = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

/**
 * Convierte filas CSV en movimientos.
 * mode: 'signed' (negativo = gasto) | 'split' (columnas cargo/abono)
 *       | 'expense' (todo gasto) | 'income' (todo ingreso)
 */
export function rowsToMovements(rows, mapping, mode) {
  return rows.map((row, index) => {
    const date = parseDate(row[mapping.date])
    const description = String(row[mapping.description] ?? '').trim()
    let amount = null
    let kind = null

    if (mode === 'split') {
      const debit  = parseAmount(row[mapping.debit])
      const credit = parseAmount(row[mapping.credit])
      if (debit && Math.abs(debit) > 0) { amount = Math.abs(debit); kind = 'expense' }
      else if (credit && Math.abs(credit) > 0) { amount = Math.abs(credit); kind = 'income' }
    } else {
      const value = parseAmount(row[mapping.amount])
      if (value !== null && value !== 0) {
        amount = Math.abs(value)
        if (mode === 'expense') kind = 'expense'
        else if (mode === 'income') kind = 'income'
        else kind = value < 0 ? 'expense' : 'income'
      }
    }

    let error = null
    if (!date) error = 'Fecha inválida'
    else if (amount === null) error = 'Monto inválido o en cero'

    return { index, date, description, amount, kind, error }
  })
}

/** Clave para detectar duplicados contra movimientos ya guardados. */
export const movementKey = (kind, date, amount, description) =>
  `${kind}|${date}|${Number(amount).toFixed(2)}|${normalizeText(description)}`
