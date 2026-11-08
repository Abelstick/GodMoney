// Tipo de dinero: bancario (cuentas, billeteras digitales) o efectivo.
export const MONEY_TYPES = [
  { value: 'BANK', label: 'Bancario' },
  { value: 'CASH', label: 'Efectivo' },
]

export const MONEY_TYPE_LABEL = { BANK: 'Bancario', CASH: 'Efectivo' }

/** Tipo de una cuenta; las anteriores a la migración 024 cuentan como bancarias. */
export const accountKind = (account) => account?.kind ?? 'BANK'

/** Suma de ingresos por tipo de dinero. Los que no lo indican van a `unknown`. */
export function totalsByMoneyType(incomes = []) {
  const totals = { BANK: 0, CASH: 0, unknown: 0 }
  for (const i of incomes) {
    const key = i.money_type === 'BANK' || i.money_type === 'CASH' ? i.money_type : 'unknown'
    totals[key] += Number(i.amount) || 0
  }
  return totals
}
