// "¿Cómo cubriste el déficit?" — concilia un periodo en negativo con lo que lo
// financió. El déficit es ingresos − consumo (ver summarize().deficit); las
// fuentes que conocemos son:
//   · retiros del ahorro: transferencias netas desde cuentas de ahorro hacia
//     cuentas que no lo son (las reposiciones y traspasos de vuelta restan)
//   · gastos registrados «Pagado desde» una cuenta de ahorro
//   · préstamos recibidos (BORROWED) que empezaron en el periodo
// Lo que no cuadra es "sin explicar": retiros o gastos que no se registraron.

const inRange = (date, { from, to }) => date >= from && date <= to

export function buildDeficitCoverage({ deficit, range, transfers = [], accounts = [], loans = [], expenses = [] }) {
  const savingsIds = new Set(accounts.filter((a) => a.is_savings).map((a) => a.id))
  const name = new Map(accounts.map((a) => [a.id, a.name]))

  const netBySavings = new Map()
  for (const t of transfers) {
    if (!inRange(t.date, range)) continue
    const fromSavings = savingsIds.has(t.from_account_id)
    const toSavings   = savingsIds.has(t.to_account_id)
    if (fromSavings === toSavings) continue // ahorro→ahorro o fuera del ahorro: no cambia nada
    const id = fromSavings ? t.from_account_id : t.to_account_id
    const delta = fromSavings ? Number(t.amount) : -Number(t.amount)
    netBySavings.set(id, (netBySavings.get(id) ?? 0) + delta)
  }

  for (const e of expenses) {
    const id = e.paid_from_account_id
    if (!savingsIds.has(id) || !inRange(e.date, range)) continue
    netBySavings.set(id, (netBySavings.get(id) ?? 0) + Number(e.amount))
  }

  const savingsByAccount = [...netBySavings]
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, name: name.get(id) ?? 'Cuenta eliminada', amount }))
    .sort((a, b) => b.amount - a.amount)

  const fromSavings = savingsByAccount.reduce((acc, r) => acc + r.amount, 0)
  const fromLoans = loans
    .filter((l) => l.type === 'BORROWED' && l.status !== 'CANCELLED' && inRange(l.start_date, range))
    .reduce((acc, l) => acc + Number(l.principal_amount), 0)

  const unexplained = Math.max(0, deficit - fromSavings - fromLoans)

  return {
    deficit,
    fromSavings,
    fromLoans,
    unexplained,
    savingsByAccount,
    // Lo que razonablemente salió del ahorro: lo no cubierto por préstamos
    // (incluye lo sin explicar, que suele ser ahorro sacado sin registrar).
    suggestedDebt: Math.max(0, deficit - fromLoans),
  }
}

/** Etiqueta del periodo para la deuda: '2025', '2025-03' o 'dd/mm/aaaa – dd/mm/aaaa'. */
export function periodLabelFor({ from, to }, formatDate = (d) => d) {
  const y = from.slice(0, 4)
  if (from === `${y}-01-01` && to === `${y}-12-31`) return y
  const ym = from.slice(0, 7)
  if (from === `${ym}-01` && to.slice(0, 7) === ym) {
    const [yy, mm] = ym.split('-').map(Number)
    if (Number(to.slice(8)) === new Date(yy, mm, 0).getDate()) return ym
  }
  return `${formatDate(from)} – ${formatDate(to)}`
}
