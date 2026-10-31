import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Anchor, Button, Progress } from '@mantine/core'
import { IconAlertCircle, IconReceipt2, IconCoin, IconPigMoney } from '@tabler/icons-react'
import { parseISO, subMonths, format as formatDate } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  useStore, selectTotalIncome, selectProfit,
  selectAvailableMoney, selectReceivable, selectPayable, selectNetWorth,
} from '@/store'
import { useIncome }     from '@/hooks/useIncome'
import { useExpenses }   from '@/hooks/useExpenses'
import { useGoals }      from '@/hooks/useGoals'
import { useBudgets }    from '@/hooks/useBudgets'
import { useAccounts }   from '@/hooks/useAccounts'
import { useLoans }      from '@/hooks/useLoans'
import { useLoanAlerts } from '@/hooks/useLoanAlerts'
import { useRecurringPaymentAlerts } from '@/hooks/useRecurringPaymentAlerts'
import { useMonthFilter } from '@/hooks/useMonthFilter'
import { formatMonth } from '@/lib/formatters'
import { splitSavings, isSavingsExpense, getSavingsRate } from '@/lib/savings'
import { allBudgetCategoryIds, getBudgetStatus, BUDGET_STATUS_TONE } from '@/lib/budgetStatus'
import { getPriorityAlert } from '@/lib/priorityAlert'
import { MONTHS_HISTORY } from '@/lib/constants'
import { buildChartData } from '@/features/predictions/utils/predictionAlgorithms'
import { incomeService }  from '@/services/incomeService'
import { expenseService } from '@/services/expenseService'
import { Card }          from '@/components/ui/Card/Card'
import { StatCard }      from '@/components/ui/StatCard/StatCard'
import { Money }         from '@/components/ui/Money/Money'
import { StatusBadge }   from '@/components/ui/StatusBadge/StatusBadge'
import { PageHeader }    from '@/components/ui/PageHeader/PageHeader'
import { MonthPicker }   from '@/components/common/MonthPicker/MonthPicker'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { PriorityAlert } from './components/PriorityAlert'
import { BalanceHero }   from './components/BalanceHero'
import { GoalsPreview }  from './components/GoalsPreview'
import { MonthlyChart }  from './components/MonthlyChart'
import { RecentTransactions } from './components/RecentTransactions'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const { activeMonth, setActiveMonth, months } = useMonthFilter()

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
  const { alerts: loanAlerts, markLoanAlertRead } = useLoanAlerts()
  const { alerts: recurringAlerts, markAlertRead: markRecurringAlertRead } = useRecurringPaymentAlerts()
  const budgetsSpent = useStore((s) => s.budgetsSpent)

  const totalIncome    = useStore(selectTotalIncome)
  const profit         = useStore(selectProfit)
  const availableMoney = useStore(selectAvailableMoney)
  const receivable     = useStore(selectReceivable)
  const payable        = useStore(selectPayable)
  const netWorth       = useStore(selectNetWorth)

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
    }).catch(() => {
      // Sin histórico el gráfico muestra su estado vacío; el resto del resumen sigue.
    }).finally(() => setHistoryLoaded(true))
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
  const isCurrentMonth = activeMonth === formatDate(new Date(), 'yyyy-MM')

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

  // ── Gasto real vs ahorro: el ahorro sigue restando al resultado del mes (es
  // dinero que no se toca), pero no se muestra como consumo ──
  const { consumptionTotal, savingsTotal } = useMemo(() => splitSavings(expenses), [expenses])
  const savingsRate = getSavingsRate(savingsTotal, totalIncome)
  const prevConsumption = histExpense
    .filter((e) => e.date.slice(0, 7) === prevMonthKey && !isSavingsExpense(e))
    .reduce((acc, e) => acc + Number(e.amount), 0)

  const incomeTrendPct  = trendPct(totalIncome, prevEntry?.income ?? 0)
  const expenseTrendPct = trendPct(consumptionTotal, prevConsumption)

  // ── Gastado vs presupuesto: solo presupuestos mensuales. Lo gastado se toma
  // de las categorías cubiertas (sin contar dos veces una categoría que esté
  // en dos presupuestos), para que el % no se infle con gastos sin presupuesto ──
  const budgetOverview = useMemo(() => {
    const monthly = budgets.filter((b) => b.period === 'monthly')
    if (!monthly.length) return null
    const limit = monthly.reduce((acc, b) => acc + Number(b.amount), 0)
    const spent = allBudgetCategoryIds(monthly).reduce((acc, id) => acc + (budgetsSpent[id] ?? 0), 0)
    const status = getBudgetStatus(spent, limit)
    return { limit, spent, percent: limit > 0 ? Math.round((spent / limit) * 100) : 0, ...BUDGET_STATUS_TONE[status] }
  }, [budgets, budgetsSpent])

  // ── Alerta prioritaria: pagos (siempre) y presupuestos (solo el mes en curso,
  // los de meses pasados ya son historia) ──
  const priority = useMemo(() => getPriorityAlert({
    loanAlerts,
    recurringAlerts,
    budgets: isCurrentMonth ? budgets : [],
  }), [loanAlerts, recurringAlerts, budgets, isCurrentMonth])

  function dismissPriority() {
    const { top } = priority
    if (top.source === 'loan') markLoanAlertRead(top.id)
    if (top.source === 'recurring') markRecurringAlertRead(top.id)
  }

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
  const trendLabel = `vs ${prevMonthShortLabel}`

  return (
    <div>
      <PageHeader
        title="Resumen"
        actions={
          <>
            {showRefreshing && <span className={styles.refreshingTag} aria-live="polite">Actualizando…</span>}
            <MonthPicker value={activeMonth} onChange={setActiveMonth} months={months} />
          </>
        }
      />

      {hasError && (
        <Alert
          color="expense"
          variant="light"
          icon={<IconAlertCircle size={20} />}
          title="No pudimos cargar tus movimientos"
          className={styles.section}
        >
          <div className={styles.errorRow}>
            <span>Revisa tu conexión e inténtalo de nuevo.</span>
            <Button size="xs" variant="default" onClick={handleRetry}>Reintentar</Button>
          </div>
        </Alert>
      )}

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : (
        <>
          <PriorityAlert
            alert={priority.top}
            total={priority.total}
            onDismiss={priority.top && priority.top.source !== 'budget' ? dismissPriority : undefined}
          />

          <BalanceHero
            availableMoney={availableMoney}
            receivable={receivable}
            payable={payable}
            netWorth={netWorth}
            accountsCount={accounts.length}
          />

          {/* ── Los 3 indicadores del mes ── */}
          <div className={styles.kpis}>
            <StatCard
              className={styles.kpiMain}
              label="Gastado"
              amount={<Money value={consumptionTotal} />}
              icon={<IconReceipt2 size={18} stroke={1.75} />}
              iconBg="var(--color-expense-light)"
              iconColor="var(--color-expense)"
              trend={expenseTrendPct !== null ? `${Math.abs(expenseTrendPct)}%` : undefined}
              trendUp={expenseTrendPct !== null ? expenseTrendPct >= 0 : undefined}
              trendLabel={trendLabel}
              invertTrendColor
            >
              {budgetOverview ? (
                <>
                  <Progress
                    value={Math.min(budgetOverview.percent, 100)}
                    color={budgetOverview.progress}
                    size="md"
                    aria-label={`${budgetOverview.percent}% del presupuesto usado`}
                  />
                  <div className={styles.budgetRow}>
                    <span className={styles.budgetText}>
                      <Money value={budgetOverview.spent} /> de <Money value={budgetOverview.limit} /> presupuestado
                    </span>
                    <StatusBadge tone={budgetOverview.tone} size="sm">{budgetOverview.label}</StatusBadge>
                  </div>
                </>
              ) : (
                <span className={styles.budgetText}>
                  Sin presupuesto mensual · <Anchor component={Link} to="/presupuestos" size="xs" fw={600}>Crear uno</Anchor>
                </span>
              )}
            </StatCard>

            <StatCard
              label="Ingresos"
              amount={<Money value={totalIncome} />}
              icon={<IconCoin size={18} stroke={1.75} />}
              iconBg="var(--color-income-light)"
              iconColor="var(--color-income)"
              trend={incomeTrendPct !== null ? `${Math.abs(incomeTrendPct)}%` : undefined}
              trendUp={incomeTrendPct !== null ? incomeTrendPct >= 0 : undefined}
              trendLabel={trendLabel}
            >
              <span className={styles.budgetText}>
                Resultado del mes: <Money value={profit} tone="auto" signed />
              </span>
            </StatCard>

            <StatCard
              label="Ahorro real"
              amount={<Money value={savingsTotal} tone={savingsTotal > 0 ? 'savings' : 'neutral'} />}
              icon={<IconPigMoney size={18} stroke={1.75} />}
              iconBg="var(--color-savings-light)"
              iconColor="var(--color-savings)"
            >
              <span className={styles.budgetText}>
                {savingsRate !== null && savingsTotal > 0
                  ? `${savingsRate}% de tus ingresos`
                  : 'Registra un gasto con categoría de ahorro para verlo aquí'}
              </span>
            </StatCard>
          </div>

          {/* ── Recientes + objetivos ── */}
          <div className={styles.twoCol}>
            <Card>
              <Card.Header action={<Anchor component={Link} to="/movimientos" size="sm" fw={600}>Ver todos</Anchor>}>
                Movimientos recientes
              </Card.Header>
              <RecentTransactions
                incomes={incomes}
                expenses={expenses}
                hasAnyHistory={hasAnyHistory}
                activeMonthLabel={activeMonthLabel}
              />
            </Card>

            <Card>
              <Card.Header action={activeGoals.length > 0 && <Anchor component={Link} to="/objetivos" size="sm" fw={600}>Ver todos</Anchor>}>
                Objetivos
              </Card.Header>
              <GoalsPreview goals={activeGoals} />
            </Card>
          </div>

          <Card>
            <Card.Header>Ingresos vs gastos</Card.Header>
            <MonthlyChart data={chartData} />
          </Card>
        </>
      )}
    </div>
  )
}
