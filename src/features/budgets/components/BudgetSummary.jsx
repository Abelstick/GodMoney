import { Progress } from '@mantine/core'
import { formatCurrency } from '@/lib/formatters'
import { BUDGET_STATUS_TONE, getBudgetStatus } from '@/lib/budgetStatus'
import styles from './BudgetSummary.module.css'

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`

function SummaryNote({ summary }) {
  const notes = []
  if (summary.otherPeriodCount > 0) {
    notes.push(`Este total solo suma presupuestos mensuales; ${plural(summary.otherPeriodCount, 'presupuesto')} de otro período se ven abajo.`)
  }
  if (summary.hasSharedCategories) {
    notes.push('Hay categorías en más de un presupuesto: su gasto se cuenta una vez, pero sus límites se suman.')
  }
  return notes.length > 0 ? <p className={styles.note}>{notes.join(' ')}</p> : null
}

// Total de los presupuestos mensuales. Sin mensuales no hay nada que sumar.
export function BudgetSummary({ summary }) {
  if (!summary) return null

  const { limit, spent, net, percent, monthlyCount } = summary
  const over = net < 0
  const { progress } = BUDGET_STATUS_TONE[getBudgetStatus(spent, limit)]

  return (
    <section className={styles.wrapper} aria-label="Total de presupuestos mensuales">
      <div className={styles.head}>
        <span className={`${styles.value} ${over ? styles.over : ''}`}>{formatCurrency(Math.abs(net))}</span>
        <span className={styles.label}>
          {over ? 'por encima del límite mensual' : 'restantes en tus presupuestos mensuales'}
        </span>
      </div>
      <Progress
        value={Math.min(percent, 100)}
        color={progress}
        size="md"
        aria-label={`${percent}% del límite mensual usado`}
      />
      <p className={styles.detail}>
        Gastado {formatCurrency(spent)} de {formatCurrency(limit)} · {percent}% · {plural(monthlyCount, 'presupuesto')}
      </p>
      <SummaryNote summary={summary} />
    </section>
  )
}
