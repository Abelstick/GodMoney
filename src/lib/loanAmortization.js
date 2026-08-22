import { addMonths, format } from 'date-fns'

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/**
 * Genera el cronograma de cuotas de un préstamo.
 * Sin interés: capital dividido en partes iguales.
 * Con interés (sistema francés): cuota total constante, interés decreciente.
 * La última cuota absorbe el residuo de redondeo para que la suma de
 * capital de las cuotas sea exactamente igual al principal.
 */
export function buildInstallmentSchedule({
  principal,
  interestRate = 0,
  interestType = 'NONE',
  numberOfInstallments = 1,
  startDate,
  dueDate,
}) {
  const n = Math.max(1, Math.round(numberOfInstallments))
  const p = Number(principal)
  const rate = interestType === 'PERCENTAGE' ? Number(interestRate) / 100 : 0
  const base = typeof startDate === 'string' ? new Date(`${startDate}T00:00:00`) : startDate

  // Préstamo simple (una sola cuota): respeta la fecha de vencimiento indicada por el usuario.
  // Con varias cuotas, se espacian mensualmente a partir de la fecha de inicio.
  const dueDateFor = (i) => {
    if (n === 1 && dueDate) return typeof dueDate === 'string' ? dueDate : format(dueDate, 'yyyy-MM-dd')
    return format(addMonths(base, i), 'yyyy-MM-dd')
  }

  const installments = []
  let balance = p

  if (rate <= 0) {
    const flatPrincipal = round2(p / n)
    for (let i = 1; i <= n; i++) {
      const isLast = i === n
      const principalAmount = isLast ? round2(balance) : flatPrincipal
      balance = round2(balance - principalAmount)
      installments.push({
        installment_number: i,
        due_date: dueDateFor(i),
        principal_amount: principalAmount,
        interest_amount: 0,
        total_amount: principalAmount,
      })
    }
    return installments
  }

  const payment = (p * rate) / (1 - Math.pow(1 + rate, -n))

  for (let i = 1; i <= n; i++) {
    const isLast = i === n
    const interestAmount = round2(balance * rate)
    let principalAmount = isLast ? round2(balance) : round2(payment - interestAmount)
    balance = round2(balance - principalAmount)

    installments.push({
      installment_number: i,
      due_date: dueDateFor(i),
      principal_amount: principalAmount,
      interest_amount: interestAmount,
      total_amount: round2(principalAmount + interestAmount),
    })
  }

  return installments
}

export function scheduleTotals(installments) {
  return installments.reduce(
    (acc, i) => ({
      principal: round2(acc.principal + Number(i.principal_amount)),
      interest:  round2(acc.interest  + Number(i.interest_amount)),
      total:     round2(acc.total     + Number(i.total_amount)),
    }),
    { principal: 0, interest: 0, total: 0 }
  )
}
