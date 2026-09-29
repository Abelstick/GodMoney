// Un gasto en una categoría marcada como ahorro (categories.is_savings) sale
// del disponible del mes igual que cualquier gasto, pero no es consumo: los
// reportes lo separan para mostrar "gasto real" vs "ahorrado" y la tasa de
// ahorro. Si el gasto tiene savings_account_id, un trigger en BD suma el
// monto al saldo de esa cuenta (ver 008_savings_expenses.sql).
export function isSavingsExpense(expense) {
  return Boolean(expense.category?.is_savings)
}

function sumAmounts(rows) {
  return rows.reduce((acc, r) => acc + Number(r.amount), 0)
}

export function splitSavings(expenses = []) {
  const consumption = expenses.filter((e) => !isSavingsExpense(e))
  const savings     = expenses.filter(isSavingsExpense)
  return {
    consumption,
    savings,
    consumptionTotal: sumAmounts(consumption),
    savingsTotal:     sumAmounts(savings),
  }
}

// % de los ingresos del mes que se apartó como ahorro; null si no hubo ingresos.
export function getSavingsRate(savingsTotal, incomeTotal) {
  if (incomeTotal <= 0) return null
  return Math.round((savingsTotal / incomeTotal) * 100)
}
