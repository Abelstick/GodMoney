// Historial de una cuenta a partir de lo que trae accountActivityService.get().
// Cada fila: { id, date, created_at, label, detail, amount (+ entra / − sale), tag }
// tag: 'withdrawal' (salió del ahorro y queda por reponer) | 'repayment' | null

export function buildAccountActivity(accountId, {
  transfers = [], paidExpenses = [], savingsExpenses = [], debtTransferIds = [],
} = {}) {
  const debtTransfers = new Set(debtTransferIds)
  const rows = []

  for (const t of transfers) {
    const incoming = t.to_account_id === accountId
    const other = incoming ? t.from_account : t.to_account
    let tag = null
    if (incoming && t.repays_withdrawal_id) tag = 'repayment'
    else if (!incoming && debtTransfers.has(t.id)) tag = 'withdrawal'
    rows.push({
      id: `t-${t.id}`,
      date: t.date,
      created_at: t.created_at,
      label: t.note || (incoming ? 'Transferencia recibida' : 'Transferencia enviada'),
      detail: incoming ? `Desde ${other?.name ?? 'otra cuenta'}` : `Hacia ${other?.name ?? 'otra cuenta'}`,
      amount: incoming ? Number(t.amount) : -Number(t.amount),
      tag,
    })
  }

  for (const e of paidExpenses) {
    rows.push({
      id: `pe-${e.id}`,
      date: e.date,
      created_at: e.created_at,
      label: e.description || e.category?.name || 'Gasto',
      detail: e.category?.name && e.description ? `Gasto · ${e.category.name}` : 'Gasto',
      amount: -Number(e.amount),
      tag: e.repay_to_savings ? 'expense-withdrawal' : null,
    })
  }

  for (const e of savingsExpenses) {
    rows.push({
      id: `se-${e.id}`,
      date: e.date,
      created_at: e.created_at,
      label: e.description || 'Aporte de ahorro',
      detail: 'Ahorro',
      amount: Number(e.amount),
      tag: null,
    })
  }

  return rows.sort((a, b) =>
    b.date.localeCompare(a.date) || String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
}

/** Entradas y salidas de un conjunto de filas (opcionalmente de un mes 'yyyy-MM'). */
export function activityTotals(rows, month = null) {
  let incoming = 0
  let outgoing = 0
  for (const r of rows) {
    if (month && r.date.slice(0, 7) !== month) continue
    if (r.amount >= 0) incoming += r.amount
    else outgoing += -r.amount
  }
  return { incoming, outgoing, net: incoming - outgoing }
}

/**
 * Cuánto se sacó del ahorro y cuánto se repuso en un rango, para el resumen.
 * Sacado: transferencias ahorro → no-ahorro + gastos pagados desde una cuenta de ahorro.
 * Repuesto: transferencias no-ahorro → ahorro marcadas como reposición.
 */
export function savingsFlow({ transfers = [], expenses = [], accounts = [], range }) {
  const savings = new Set(accounts.filter((a) => a.is_savings).map((a) => a.id))
  const inRange = (d) => !range || (d >= range.from && d <= range.to)
  let withdrawn = 0
  let repaid = 0
  for (const t of transfers) {
    if (!inRange(t.date)) continue
    const fromS = savings.has(t.from_account_id)
    const toS = savings.has(t.to_account_id)
    if (fromS && !toS) withdrawn += Number(t.amount)
    if (toS && !fromS && t.repays_withdrawal_id) repaid += Number(t.amount)
  }
  for (const e of expenses) {
    if (inRange(e.date) && savings.has(e.paid_from_account_id)) withdrawn += Number(e.amount)
  }
  return { withdrawn, repaid }
}
