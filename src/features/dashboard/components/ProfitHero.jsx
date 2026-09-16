import { formatCurrency } from '@/lib/formatters'
import styles from './ProfitHero.module.css'

export function ProfitHero({
  profit, monthLabel, trendPct, prevMonthShortLabel,
  incomeSharePct, expenseSharePct, flowTotal,
}) {
  const isNegative = profit < 0

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div>
          <div className={styles.label}>
            <span className={`${styles.dot} ${isNegative ? styles.dotDown : styles.dotUp}`} />
            Profit — {monthLabel}
          </div>
          <div className={styles.caption}>Resultado neto del periodo</div>
        </div>
        {trendPct !== null && (
          <span className={`${styles.trendBadge} ${trendPct >= 0 ? styles.trendFavorable : styles.trendUnfavorable}`}>
            {trendPct >= 0 ? '+' : ''}{trendPct}% vs {prevMonthShortLabel}
          </span>
        )}
      </div>

      <div className={`${styles.amount} ${isNegative ? styles.negative : styles.positive}`}>
        {profit > 0 ? '+' : ''}{formatCurrency(profit)}
      </div>

      {flowTotal > 0 && (
        <div className={styles.splitBar}>
          <div className={styles.splitTrack}>
            <div className={styles.splitIncome} style={{ width: `${incomeSharePct}%` }} />
            <div className={styles.splitExpense} style={{ width: `${expenseSharePct}%` }} />
          </div>
          <div className={styles.splitLabels}>
            <span className={styles.splitIncomeLabel}>Ingresos: {incomeSharePct.toFixed(1)}%</span>
            <span className={styles.splitExpenseLabel}>Gastos: {expenseSharePct.toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
