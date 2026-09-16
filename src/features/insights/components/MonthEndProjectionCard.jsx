import { IconCoin, IconReceipt2, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react'
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
          icon={<IconCoin size={20} stroke={1.75} />}
          iconBg="var(--color-success-light)"
        />
        <StatCard
          label="Gasto proyectado"
          amount={formatCurrency(projectedExpense)}
          icon={<IconReceipt2 size={20} stroke={1.75} />}
          iconBg="var(--color-danger-light)"
        />
        <StatCard
          label="Ahorro proyectado"
          amount={formatCurrency(projectedProfit)}
          icon={projectedProfit >= 0 ? <IconTrendingUp size={20} stroke={1.75} /> : <IconTrendingDown size={20} stroke={1.75} />}
          iconBg={projectedProfit >= 0 ? 'var(--color-primary-alpha)' : 'var(--color-danger-light)'}
        />
      </div>
    </Card>
  )
}
