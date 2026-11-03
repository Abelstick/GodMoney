import { runProjection } from './projection'

/**
 * Compara dos escenarios en la misma ventana de fechas (cada uno con su propio
 * saldo inicial, eventos y límite). Las diferencias son B − A: negativo = con
 * B tendrías menos dinero.
 */
export function compareScenarios(a, b, window) {
  const left = runProjection(a, window)
  const right = runProjection(b, window)

  const rows = left.checkpoints.map((row, i) => {
    const other = right.checkpoints[i].balance
    return {
      label: row.label,
      date: row.date,
      a: row.balance,
      b: other,
      diff: row.balance === null || other === null ? null : other - row.balance,
    }
  })

  const series = left.points.map((p, i) => ({
    date: p.date,
    a: p.balance,
    b: right.points[i]?.balance ?? null,
  }))

  return {
    a: left,
    b: right,
    rows,
    series,
    diff: {
      initial: right.summary.initial - left.summary.initial,
      final: right.summary.final - left.summary.final,
      min: right.summary.min.balance - left.summary.min.balance,
      income: right.summary.income - left.summary.income,
      outflow: right.summary.outflow - left.summary.outflow,
    },
  }
}
