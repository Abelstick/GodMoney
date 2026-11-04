import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Anchor, Button } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { parseISO, subMonths, format as formatDate } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  useStore, selectTotalIncome, selectProfit,
  selectAvailableMoney, selectReceivable, selectPayable,
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
import { usePersistentState } from '@/hooks/usePersistentState'
import { formatMonth } from '@/lib/formatters'
import { splitSavings, isSavingsExpense, getSavingsRate } from '@/lib/savings'
import { allBudgetCategoryIds, getBudgetStatus, BUDGET_STATUS_TONE } from '@/lib/budgetStatus'
import { getPriorityAlert } from '@/lib/priorityAlert'
import { upcomingOccasions } from '@/lib/giftPlanning'
import { MONTHS_HISTORY } from '@/lib/constants'
import { buildChartData } from '@/features/predictions/utils/predictionAlgorithms'
import { incomeService }  from '@/services/incomeService'
import { expenseService } from '@/services/expenseService'
import { transferService } from '@/services/transferService'
import { savingsFlow } from '@/lib/accountActivity'
import { pendingAmount } from '@/services/savingsWithdrawalService'
import { getMonthRange } from '@/lib/formatters'
import { Card }          from '@/components/ui/Card/Card'
import { PageHeader }    from '@/components/ui/PageHeader/PageHeader'
import { MonthPicker }   from '@/components/common/MonthPicker/MonthPicker'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { PriorityAlert } from './components/PriorityAlert'
import { BalanceHero }   from './components/BalanceHero'
import { MonthSummary }  from './components/MonthSummary'
import { SpendingBreakdown } from './components/SpendingBreakdown'
import { GoalsPreview }  from './components/GoalsPreview'
import { MonthlyChart }  from './components/MonthlyChart'
import { RecentTransactions } from './components/RecentTransactions'
import { UpcomingGifts, UpcomingGiftsSkeleton } from './components/UpcomingGifts'
import { SavingsDebtPreview } from './components/SavingsDebtPreview'
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

  // Regalos: carga silenciosa (si la sección no se usa, la tarjeta no aparece).
  const giftOccasions = useStore((s) => s.giftOccasions)
  const gifts         = useStore((s) => s.gifts)
  const giftsLoading  = useStore((s) => s.giftsLoading)
  const giftsLoaded   = useStore((s) => s.giftsLoaded)
  const fetchGiftData = useStore((s) => s.fetchGiftData)
  useEffect(() => { fetchGiftData({ silent: true }) }, [])
  // Se recuerda si había fechas para mostrar el esqueleto solo a quien usa
  // Regalos (sin esto la tarjeta aparecería de golpe o parpadearía en vacío).
  const [hadGiftOccasions, setHadGiftOccasions] = usePersistentState('godmoney:hasGiftOccasions', false)
  useEffect(() => {
    if (giftsLoaded) setHadGiftOccasions(giftOccasions.length > 0)
  }, [giftsLoaded, giftOccasions.length])
  const showGiftsSkeleton = !giftsLoaded && giftsLoading && hadGiftOccasions

  // Deudas con el ahorro: carga silenciosa; la tarjeta solo aparece si hay abiertas.
  const savingsDebts            = useStore((s) => s.savingsWithdrawals)
  const fetchSavingsWithdrawals = useStore((s) => s.fetchSavingsWithdrawals)
  useEffect(() => { fetchSavingsWithdrawals() }, [])
  const hasOpenSavingsDebt = savingsDebts.some((d) => d.status === 'OPEN')
  const pendingRepay = savingsDebts.reduce((acc, d) => acc + pendingAmount(d), 0)

  // Cuánto salió del ahorro y cuánto se repuso en el mes elegido.
  const [monthTransfers, setMonthTransfers] = useState([])
  useEffect(() => {
    let alive = true
    const { from, to } = getMonthRange(parseISO(`${activeMonth}-01`))
    transferService.getRange(from, to)
      .then((rows) => { if (alive) setMonthTransfers(rows) })
      .catch(() => { if (alive) setMonthTransfers([]) })
    return () => { alive = false }
  }, [activeMonth, savingsDebts]) // se refresca cuando cambian las deudas (retiros/reposiciones)
  const monthSavingsFlow = useMemo(
    () => savingsFlow({ transfers: monthTransfers, expenses, accounts }),
    [monthTransfers, expenses, accounts],
  )
  const showSavingsCard = hasOpenSavingsDebt || monthSavingsFlow.withdrawn > 0 || monthSavingsFlow.repaid > 0

  const totalIncome    = useStore(selectTotalIncome)
  const profit         = useStore(selectProfit)
  const availableMoney = useStore(selectAvailableMoney)
  const receivable     = useStore(selectReceivable)
  const payable        = useStore(selectPayable)

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
  const goalsById = useMemo(() => Object.fromEntries(goals.map((g) => [g.id, g])), [goals])
  const upcomingGifts = useMemo(() => upcomingOccasions(giftOccasions), [giftOccasions])
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
    savingsDebts,
  }), [loanAlerts, recurringAlerts, budgets, isCurrentMonth, savingsDebts])

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

          {/* 1 · Lo que tienes hoy · 2 · Cómo va el periodo */}
          <div className={styles.top}>
            <BalanceHero
              availableMoney={availableMoney}
              receivable={receivable}
              payable={payable}
              accountsCount={accounts.length}
              pendingRepay={pendingRepay}
            />
            <MonthSummary
              monthLabel={activeMonthLabel}
              trendLabel={trendLabel}
              consumptionTotal={consumptionTotal}
              expenseTrendPct={expenseTrendPct}
              budgetOverview={budgetOverview}
              totalIncome={totalIncome}
              incomeTrendPct={incomeTrendPct}
              savingsTotal={savingsTotal}
              savingsRate={savingsRate}
              profit={profit}
            />
          </div>

          {/* 3 · Qué se movió y a dónde fue */}
          <div className={styles.split}>
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
              <Card.Header action={<Anchor component={Link} to="/gastos" size="sm" fw={600}>Ver gastos</Anchor>}>
                En qué se fue
              </Card.Header>
              <SpendingBreakdown expenses={expenses} />
            </Card>
          </div>

          {/* 4 · Contexto: evolución y metas */}
          <div className={styles.splitReverse}>
            <Card>
              <Card.Header>Ingresos vs gastos</Card.Header>
              <MonthlyChart data={chartData} />
            </Card>

            <div className={styles.stack}>
              <Card>
                <Card.Header action={activeGoals.length > 0 && <Anchor component={Link} to="/objetivos" size="sm" fw={600}>Ver todos</Anchor>}>
                  Objetivos
                </Card.Header>
                <GoalsPreview goals={activeGoals} />
              </Card>

              {showSavingsCard && (
                <Card>
                  <Card.Header action={<Anchor component={Link} to="/cuentas" size="sm" fw={600}>Reponer</Anchor>}>
                    Por reponer
                  </Card.Header>
                  <SavingsDebtPreview debts={savingsDebts} flow={monthSavingsFlow} monthLabel={activeMonthLabel} />
                </Card>
              )}

              {(upcomingGifts.length > 0 || showGiftsSkeleton) && (
                <Card>
                  <Card.Header action={<Anchor component={Link} to="/regalos" size="sm" fw={600}>Ver regalos</Anchor>}>
                    Próximas fechas
                  </Card.Header>
                  {showGiftsSkeleton
                    ? <UpcomingGiftsSkeleton />
                    : <UpcomingGifts upcoming={upcomingGifts} gifts={gifts} goalsById={goalsById} />}
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
