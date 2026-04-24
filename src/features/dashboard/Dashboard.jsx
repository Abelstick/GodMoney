import { useStore, selectTotalIncome, selectTotalExpense, selectProfit } from '@/store'
import { useIncome }     from '@/hooks/useIncome'
import { useExpenses }   from '@/hooks/useExpenses'
import { useGoals }      from '@/hooks/useGoals'
import { useBudgets }    from '@/hooks/useBudgets'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth } from '@/lib/formatters'
import { getPastMonths } from '@/lib/formatters'
import { Card }          from '@/components/ui/Card/Card'
import { StatCard }      from '@/components/ui/StatCard/StatCard'
import { ProgressBar }   from '@/components/ui/ProgressBar/ProgressBar'
import { MonthlyChart }  from './components/MonthlyChart'
import { RecentTransactions } from './components/RecentTransactions'
import styles from './Dashboard.module.css'
import { useMemo } from 'react'
import { buildChartData } from '@/features/predictions/utils/predictionAlgorithms'
import { incomeService }  from '@/services/incomeService'
import { expenseService } from '@/services/expenseService'
import { useState, useEffect } from 'react'
import { MONTHS_HISTORY } from '@/lib/constants'
import { parseISO } from 'date-fns'

export function Dashboard() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(6), [])

  const { incomes, loading: incLoading }  = useIncome()
  const { expenses, loading: expLoading } = useExpenses()
  const { goals }   = useGoals()
  const { budgets } = useBudgets()

  const totalIncome  = useStore(selectTotalIncome)
  const totalExpense = useStore(selectTotalExpense)
  const profit       = useStore(selectProfit)

  // Datos históricos para el gráfico de barras del dashboard
  const [histIncome,  setHistIncome]  = useState([])
  const [histExpense, setHistExpense] = useState([])

  useEffect(() => {
    Promise.all([
      incomeService.getHistorical(MONTHS_HISTORY),
      expenseService.getHistorical(MONTHS_HISTORY),
    ]).then(([inc, exp]) => {
      setHistIncome(inc)
      setHistExpense(exp)
    })
  }, [])

  const chartData = useMemo(() => {
    if (!histIncome.length && !histExpense.length) return []
    // Solo histórico, sin proyección
    return buildChartData(histIncome, histExpense, 0)
  }, [histIncome, histExpense])

  const activeGoals = goals.filter((g) => g.status === 'active')

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.subtitle}>Resumen de tus finanzas personales</p>

      {/* ── Filtro de meses ── */}
      <div className={styles.monthFilter}>
        {months.map((m) => (
          <button
            key={m.key}
            className={`${styles.monthBtn} ${activeMonth === m.key ? styles.active : ''}`}
            onClick={() => setActiveMonth(m.key)}
          >
            {m.label} {m.year}
          </button>
        ))}
      </div>

      {/* ── Profit destacado ── */}
      <div className={`${styles.profitCard} ${styles.mb6}`}>
        <div className={styles.profitLabel}>
          Profit — {formatMonth(parseISO(`${activeMonth}-01`))}
        </div>
        <div className={styles.profitAmount}>{formatCurrency(profit)}</div>
      </div>

      {/* ── Stats Grid ── */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Ingresos"
          amount={formatCurrency(totalIncome)}
          icon="💰"
          iconBg="rgba(16,185,129,0.12)"
        />
        <StatCard
          label="Gastos"
          amount={formatCurrency(totalExpense)}
          icon="💸"
          iconBg="rgba(239,68,68,0.12)"
        />
        <StatCard
          label="Objetivos activos"
          amount={activeGoals.length}
          icon="🎯"
          iconBg="rgba(99,102,241,0.12)"
        />
        <StatCard
          label="Presupuestos"
          amount={budgets.length}
          icon="📋"
          iconBg="rgba(245,158,11,0.12)"
        />
      </div>

      {/* ── Gráfico + Transacciones recientes ── */}
      <div className={styles.twoCol}>
        <Card className={styles.mb4}>
          <Card.Header>Evolución mensual</Card.Header>
          <MonthlyChart data={chartData} />
        </Card>

        <Card>
          <Card.Header>Movimientos recientes</Card.Header>
          <RecentTransactions incomes={incomes} expenses={expenses} limit={6} />
        </Card>
      </div>

      {/* ── Progreso de objetivos ── */}
      {activeGoals.length > 0 && (
        <Card>
          <Card.Header>Objetivos en curso</Card.Header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {activeGoals.slice(0, 3).map((g) => {
              const pct = Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100)
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-sm)' }}>
                    <span style={{ fontWeight: 600 }}>{g.name}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                    </span>
                  </div>
                  <ProgressBar
                    percent={pct}
                    color={g.color}
                    leftLabel={`${pct}%`}
                    rightLabel={formatCurrency(g.target_amount - g.current_amount) + ' restante'}
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
