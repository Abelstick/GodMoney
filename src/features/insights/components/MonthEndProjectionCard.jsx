import { Card }     from '@/components/ui/Card/Card'
import { StatCard } from '@/components/ui/StatCard/StatCard'
import { Badge }    from '@/components/ui/Badge/Badge'
import { formatCurrency } from '@/lib/formatters'
import styles from './MonthEndProjectionCard.module.css'

export function MonthEndProjectionCard({ projection }) {
  const {
    daysElapsed, daysInMonth,
    projectedIncome, projectedExpense, projectedProfit,
    expenseVsAvgPercent,
  } = projection

  return (
    <Card className={styles.mb}>
      <Card.Header
        action={expenseVsAvgPercent !== null && (
          <Badge color={expenseVsAvgPercent >= 0 ? 'var(--color-danger)' : 'var(--color-success)'}>
            {expenseVsAvgPercent >= 0 ? '+' : ''}{expenseVsAvgPercent}% vs promedio
          </Badge>
        )}
      >
        <Card.Title subtitle={`Día ${daysElapsed} de ${daysInMonth} · extrapolando tu ritmo de gasto actual`}>
          Proyección de fin de mes
        </Card.Title>
      </Card.Header>

      <div className={styles.grid}>
        <StatCard
          label="Ingreso proyectado"
          amount={formatCurrency(projectedIncome)}
          icon="💰"
          iconBg="rgba(16,185,129,0.12)"
        />
        <StatCard
          label="Gasto proyectado"
          amount={formatCurrency(projectedExpense)}
          icon="💸"
          iconBg="rgba(239,68,68,0.12)"
        />
        <StatCard
          label="Ahorro proyectado"
          amount={formatCurrency(projectedProfit)}
          icon={projectedProfit >= 0 ? '📈' : '📉'}
          iconBg={projectedProfit >= 0 ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)'}
        />
      </div>
    </Card>
  )
}
