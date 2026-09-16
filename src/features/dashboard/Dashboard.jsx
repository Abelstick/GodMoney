import { Link } from 'react-router-dom'
import {
  useStore, selectTotalIncome, selectTotalExpense, selectProfit,
  selectAvailableMoney, selectReceivable, selectPayable, selectNetWorth,
} from '@/store'
import { useIncome }     from '@/hooks/useIncome'
import { useExpenses }   from '@/hooks/useExpenses'
import { useGoals }      from '@/hooks/useGoals'
import { useBudgets }    from '@/hooks/useBudgets'
import { useAccounts }   from '@/hooks/useAccounts'
import { useLoans }      from '@/hooks/useLoans'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatCurrency, formatMonth } from '@/lib/formatters'
import { getPastMonths } from '@/lib/formatters'
import { Card }          from '@/components/ui/Card/Card'
import { StatCard }      from '@/components/ui/StatCard/StatCard'
import { ProgressBar }   from '@/components/ui/ProgressBar/ProgressBar'
import { Button }        from '@/components/ui/Button/Button'
import { IconCoin, IconReceipt2, IconTarget, IconClipboardList } from '@tabler/icons-react'
import { EmptyState }    from '@/components/common/EmptyState/EmptyState'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { ProfitHero }    from './components/ProfitHero'
import { PatrimonioCard } from './components/PatrimonioCard'
import { MonthlyChart }  from './components/MonthlyChart'
import { RecentTransactions } from './components/RecentTransactions'
import styles from './Dashboard.module.css'
import { useMemo } from 'react'
import { buildChartData } from '@/features/predictions/utils/predictionAlgorithms'
import { incomeService }  from '@/services/incomeService'
import { expenseService } from '@/services/expenseService'
import { useState, useEffect } from 'react'
import { MONTHS_HISTORY } from '@/lib/constants'
import { parseISO, subMonths, format as formatDate } from 'date-fns'
import { es } from 'date-fns/locale'

export function Dashboard() {
  const { activeMonth, setActiveMonth } = useMonthFilter()
  const months = useMemo(() => getPastMonths(6), [])

  const {
    incomes, loading: incLoading, error: incError, refetch: refetchIncomes,
  } = useIncome()
  const {
    expenses, loading: expLoading, error: expError, refetch: refetchExpenses,
  } = useExpenses()
  const { goals, loading: goalsLoading }         = useGoals()
  const { budgets, loading: budgetsLoading }     = useBudgets()
  const { accounts, loading: accLoading }        = useAccounts()
  const { loans, loading: loansLoading }         = useLoans()

  const totalIncome  = useStore(selectTotalIncome)
  const totalExpense = useStore(selectTotalExpense)
  const profit       = useStore(selectProfit)
  const availableMoney = useStore(selectAvailableMoney)
  const receivable      = useStore(selectReceivable)
  const payable          = useStore(selectPayable)
  const netWorth          = useStore(selectNetWorth)

  // Datos históricos para el gráfico de barras del dashboard
  const [histIncome,  setHistIncome]  = useState([])
  const [histExpense, setHistExpense] = useState([])
  const [historyLoaded, setHistoryLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      incomeService.getHistorical(MONTHS_HISTORY),
      expenseService.getHistorical(MONTHS_HISTORY),
    ]).then(([inc, exp]) => {
      setHistIncome(inc)
      setHistExpense(exp)
      setHistoryLoaded(true)
    })
  }, [])

  const chartData = useMemo(() => {
    if (!histIncome.length && !histExpense.length) return []
    // Solo histórico, sin proyección
    return buildChartData(histIncome, histExpense, 0)
  }, [histIncome, histExpense])

  // Antes de que cargue el histórico asumimos que sí hay datos, para no
  // mostrar por un instante la copia de "nunca hubo registros".
  const hasAnyHistory = !historyLoaded || histIncome.length > 0 || histExpense.length > 0

  const activeGoals = goals.filter((g) => g.status === 'active')
  const activeMonthLabel = formatMonth(parseISO(`${activeMonth}-01`))

  // ── Comparación vs. mes anterior: derivada del histórico que ya se trae
  // para el gráfico (buildChartData), no es una llamada ni un cálculo nuevo ──
  const prevMonthKey = formatDate(subMonths(parseISO(`${activeMonth}-01`), 1), 'yyyy-MM')
  const prevMonthShortLabel = formatDate(subMonths(parseISO(`${activeMonth}-01`), 1), 'MMM', { locale: es })
  const prevEntry = chartData.find((d) => d.key === prevMonthKey)
  const hasBaseline = historyLoaded && Boolean(prevEntry)

  function trendPct(current, previous) {
    if (!hasBaseline) return null
    if (previous === 0) return current === 0 ? 0 : null
    return Math.round(((current - previous) / Math.abs(previous)) * 100)
  }

  const incomeTrendPct  = trendPct(totalIncome, prevEntry?.income ?? 0)
  const expenseTrendPct = trendPct(totalExpense, prevEntry?.expense ?? 0)
  const profitTrendPct  = trendPct(profit, prevEntry?.profit ?? 0)

  // ── Split ingresos/gastos del mes (mini barra bajo el hero) ──
  const flowTotal = totalIncome + totalExpense
  const incomeSharePct  = flowTotal > 0 ? (totalIncome  / flowTotal) * 100 : 0
  const expenseSharePct = flowTotal > 0 ? (totalExpense / flowTotal) * 100 : 0

  // ── Badges derivados de datos ya cargados ──
  const budgetsAtLimit = budgets.filter((b) => b.percent >= 100).length

  // ── Sub-etiquetas de Patrimonio: conteos derivados de accounts/loans ──
  const accountsCount = accounts.length
  const receivableCount = loans.filter((l) => l.type === 'LENT' && l.status !== 'CANCELLED' && l.status !== 'PAID').length
  const payableCount = loans.filter((l) => l.type === 'BORROWED' && l.status !== 'CANCELLED' && l.status !== 'PAID').length

  const isLoading = incLoading || expLoading || goalsLoading || budgetsLoading || accLoading || loansLoading
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  useEffect(() => {
    if (!isLoading) setHasLoadedOnce(true)
  }, [isLoading])

  const hasError = Boolean(incError || expError)
  const handleRetry = () => {
    refetchIncomes()
    refetchExpenses()
  }

  const showSkeleton   = isLoading && !hasLoadedOnce
  const showRefreshing = isLoading && hasLoadedOnce

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.subtitle}>Resumen de tus finanzas personales</p>

      {/* ── Filtro de meses ── */}
      <div className={styles.monthFilterRow}>
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
        {showRefreshing && <span className={styles.refreshingTag}>Actualizando…</span>}
      </div>

      {/* ── Error de carga ── */}
      {hasError && (
        <div className={`${styles.errorBanner} ${styles.mb6}`} role="alert">
          <div>
            <p className={styles.errorTitle}>No pudimos cargar tus movimientos</p>
            <p className={styles.errorDesc}>Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleRetry}>Reintentar</Button>
        </div>
      )}

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* ── Profit destacado (hero) ── */}
          <div className={styles.mb6}>
            <ProfitHero
              profit={profit}
              monthLabel={activeMonthLabel}
              trendPct={profitTrendPct}
              prevMonthShortLabel={prevMonthShortLabel}
              incomeSharePct={incomeSharePct}
              expenseSharePct={expenseSharePct}
              flowTotal={flowTotal}
            />
          </div>

          {/* ── Resumen del mes ── */}
          <Card className={styles.mb6}>
            <Card.Header>Resumen del mes</Card.Header>
            <div className={styles.statsGrid}>
              <StatCard
                label="Ingresos"
                amount={formatCurrency(totalIncome)}
                icon={<IconCoin size={20} stroke={1.75} />}
                iconBg="var(--color-success-light)"
                trend={incomeTrendPct !== null ? `${Math.abs(incomeTrendPct)}%` : undefined}
                trendUp={incomeTrendPct !== null ? incomeTrendPct >= 0 : undefined}
              />
              <StatCard
                label="Gastos"
                amount={formatCurrency(totalExpense)}
                icon={<IconReceipt2 size={20} stroke={1.75} />}
                iconBg="var(--color-danger-light)"
                trend={expenseTrendPct !== null ? `${Math.abs(expenseTrendPct)}%` : undefined}
                trendUp={expenseTrendPct !== null ? expenseTrendPct >= 0 : undefined}
                invertTrendColor
                badge={totalExpense > totalIncome ? { label: 'Exceso', tone: 'danger' } : undefined}
              />
              <StatCard
                label="Objetivos activos"
                amount={activeGoals.length}
                icon={<IconTarget size={20} stroke={1.75} />}
                iconBg="var(--color-primary-alpha)"
                badge={activeGoals.length > 0 ? { label: 'En curso', tone: 'brand' } : undefined}
              />
              <StatCard
                label="Presupuestos"
                amount={budgets.length}
                icon={<IconClipboardList size={20} stroke={1.75} />}
                iconBg="var(--color-surface-4)"
                badge={budgetsAtLimit > 0 ? { label: `${budgetsAtLimit} al límite`, tone: 'plain' } : undefined}
              />
            </div>
          </Card>

          {/* ── Patrimonio: cuentas + préstamos ── */}
          <div className={styles.mb6}>
            <PatrimonioCard
              availableMoney={availableMoney}
              receivable={receivable}
              payable={payable}
              netWorth={netWorth}
              accountsCount={accountsCount}
              receivableCount={receivableCount}
              payableCount={payableCount}
            />
          </div>

          {/* ── Gráfico + Transacciones recientes ── */}
          <div className={styles.twoCol}>
            <Card className={styles.equalCol}>
              <Card.Header>Evolución mensual</Card.Header>
              <MonthlyChart data={chartData} />
            </Card>

            <Card className={styles.equalCol}>
              <Card.Header>Movimientos recientes</Card.Header>
              <RecentTransactions
                incomes={incomes}
                expenses={expenses}
                limit={6}
                hasAnyHistory={hasAnyHistory}
                activeMonthLabel={activeMonthLabel}
              />
            </Card>
          </div>

          {/* ── Progreso de objetivos ── */}
          <Card>
            <Card.Header>Objetivos en curso</Card.Header>
            {activeGoals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {activeGoals.slice(0, 3).map((g) => {
                  const amount = g.progressAmount ?? g.current_amount
                  const pct = Math.min(Math.round((amount / g.target_amount) * 100), 100)
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-sm)' }}>
                        <span style={{ fontWeight: 600 }}>{g.name}</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {formatCurrency(amount)} / {formatCurrency(g.target_amount)}
                        </span>
                      </div>
                      <ProgressBar
                        percent={pct}
                        color={g.color}
                        leftLabel={`${pct}%`}
                        rightLabel={formatCurrency(g.target_amount - amount) + ' restante'}
                      />
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={<IconTarget size={44} stroke={1.5} />}
                title="Sin objetivos activos"
                description="Crea un objetivo para empezar a ahorrar"
                action={
                  <Link to="/objetivos">
                    <Button size="sm">Crear objetivo</Button>
                  </Link>
                }
              />
            )}
          </Card>
        </>
      )}
    </div>
  )
}
