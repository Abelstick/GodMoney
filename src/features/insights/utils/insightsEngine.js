import { getDate, getDaysInMonth, format } from 'date-fns'
import { groupByMonth, simpleMean, percentChange } from '@/features/predictions/utils/predictionAlgorithms'
import { getBudgetStatus, BUDGET_STATUS, getBudgetAlertMessage } from '@/lib/budgetStatus'
import { formatCurrency } from '@/lib/formatters'

function sum(rows) {
  return rows.reduce((acc, r) => acc + Number(r.amount), 0)
}

function severityRank(severity) {
  return { danger: 2, warning: 1, info: 0 }[severity] ?? 0
}

// ── Presupuestos del mes actual con su estado (mismo cálculo que useBudgets) ─
export function buildBudgetsWithSpent(budgets, spentByCategory) {
  return budgets.map((b) => {
    const spent  = spentByCategory[b.category_id] ?? 0
    const amount = Number(b.amount)
    return {
      ...b,
      spent,
      remaining: Math.max(amount - spent, 0),
      overBy:    Math.max(spent - amount, 0),
      percent:   amount > 0 ? Math.round((spent / amount) * 100) : 0,
      status:    getBudgetStatus(spent, amount),
    }
  })
}

// ── 1. Proyección de fin de mes ───────────────────────────────────────────
// Lo fijo/recurrente ya registrado no se vuelve a proyectar; lo variable se
// extrapola con una tasa diaria (gastado hasta hoy / días transcurridos).
export function getMonthEndProjection({ today, expenses, incomes, historicalExpenses }) {
  const daysInMonth   = getDaysInMonth(today)
  const daysElapsed   = getDate(today)
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 0)
  const currentMonthKey = format(today, 'yyyy-MM')

  const variableExpense = sum(expenses.filter((e) => !e.is_fixed))
  const spentSoFar       = sum(expenses)
  const dailyExpenseRate = daysElapsed > 0 ? variableExpense / daysElapsed : 0
  const projectedExpense = spentSoFar + dailyExpenseRate * daysRemaining

  const variableIncome  = sum(incomes.filter((i) => !i.is_recurring))
  const earnedSoFar      = sum(incomes)
  const dailyIncomeRate  = daysElapsed > 0 ? variableIncome / daysElapsed : 0
  const projectedIncome  = earnedSoFar + dailyIncomeRate * daysRemaining

  const projectedProfit = projectedIncome - projectedExpense

  const historicalByMonth = groupByMonth(historicalExpenses)
  const otherMonthTotals = Object.entries(historicalByMonth)
    .filter(([key]) => key !== currentMonthKey)
    .map(([, total]) => total)
  const avgHistoricalExpense = simpleMean(otherMonthTotals)
  const expenseVsAvgPercent = percentChange(projectedExpense, avgHistoricalExpense)

  return {
    daysInMonth, daysElapsed, daysRemaining,
    spentSoFar, projectedExpense,
    earnedSoFar, projectedIncome,
    projectedProfit,
    avgHistoricalExpense, expenseVsAvgPercent,
  }
}

// ── 2. Dinero disponible por día ──────────────────────────────────────────
export function getDailyAvailable({ today, incomes, expenses, budgetsWithSpent }) {
  const daysInMonth   = getDaysInMonth(today)
  const daysElapsed   = getDate(today)
  const daysRemaining = Math.max(daysInMonth - daysElapsed, 0)

  const moneyLeft = sum(incomes) - sum(expenses)
  const availablePerDay = moneyLeft / (daysRemaining > 0 ? daysRemaining : 1)

  const budgetsRemaining = budgetsWithSpent.reduce(
    (acc, b) => acc + Math.max(Number(b.amount) - b.spent, 0), 0
  )

  return { daysRemaining, moneyLeft, availablePerDay, budgetsRemaining }
}

// ── 3. Alertas inteligentes ───────────────────────────────────────────────
function averageAmountByCategory(rows) {
  const sums   = {}
  const counts = {}
  rows.forEach((r) => {
    if (!r.category_id) return
    sums[r.category_id]   = (sums[r.category_id]   ?? 0) + Number(r.amount)
    counts[r.category_id] = (counts[r.category_id] ?? 0) + 1
  })
  const avg = {}
  Object.keys(sums).forEach((id) => {
    if (counts[id] >= 3) avg[id] = sums[id] / counts[id]
  })
  return avg
}

const PACE_WARNING_PERCENT = 15
const PACE_DANGER_PERCENT  = 30
// Diferencia mínima para no marcar como "inusual" categorías con montos pequeños,
// donde cualquier variación duplica el promedio sin ser realmente relevante.
const UNUSUAL_MIN_DIFF = 50

export function getSmartAlerts({ today, projection, dailyAvailable, budgetsWithSpent, expenses, historicalExpenses }) {
  const alerts = []
  const currentMonthKey = format(today, 'yyyy-MM')

  budgetsWithSpent
    .filter((b) => b.status !== BUDGET_STATUS.NORMAL)
    .forEach((b) => {
      alerts.push({
        id: `budget-${b.id}`,
        severity: b.status === BUDGET_STATUS.EXCEEDED ? 'danger' : b.status === BUDGET_STATUS.REACHED ? 'warning' : 'info',
        message: `${b.name}: ${getBudgetAlertMessage(b)}`,
      })
    })

  if (projection.avgHistoricalExpense > 0 && projection.expenseVsAvgPercent >= PACE_WARNING_PERCENT) {
    alerts.push({
      id: 'pace-high',
      severity: projection.expenseVsAvgPercent >= PACE_DANGER_PERCENT ? 'danger' : 'warning',
      message: `Vas a terminar el mes gastando ${projection.expenseVsAvgPercent}% más que tu promedio (proyectado: ${formatCurrency(projection.projectedExpense)})`,
    })
  }

  if (dailyAvailable.availablePerDay < 0) {
    alerts.push({
      id: 'daily-negative',
      severity: 'danger',
      message: `Ya gastaste más de lo que ingresó este mes — disponible diario en ${formatCurrency(dailyAvailable.availablePerDay)}`,
    })
  }

  // Excluye el mes en curso: comparar un gasto contra un promedio que lo incluye a él mismo
  // sesga el umbral hacia arriba y diluye lo "inusual" que realmente es.
  const pastExpenses = historicalExpenses.filter((e) => e.date.slice(0, 7) !== currentMonthKey)
  const avgByCategory = averageAmountByCategory(pastExpenses)
  expenses.forEach((e) => {
    const catAvg = avgByCategory[e.category_id]
    const amount = Number(e.amount)
    if (catAvg && amount >= catAvg * 2 && amount - catAvg >= UNUSUAL_MIN_DIFF) {
      alerts.push({
        id: `unusual-${e.id}`,
        severity: 'info',
        message: `Gasto inusual en ${e.category?.name ?? 'una categoría'}: ${formatCurrency(amount)} (tu promedio ahí es ${formatCurrency(catAvg)})`,
      })
    }
  })

  return alerts.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

// ── 4. Gastos recurrentes ─────────────────────────────────────────────────
export function getRecurringSummary({ expenses, incomes }) {
  const fixedExpenses    = expenses.filter((e) => e.is_fixed).sort((a, b) => b.amount - a.amount)
  const recurringIncomes = incomes.filter((i) => i.is_recurring).sort((a, b) => b.amount - a.amount)

  const totalFixedExpense    = sum(fixedExpenses)
  const totalExpense         = sum(expenses)
  const totalRecurringIncome = sum(recurringIncomes)
  const pctOfExpense = totalExpense > 0 ? Math.round((totalFixedExpense / totalExpense) * 100) : 0

  return { fixedExpenses, recurringIncomes, totalFixedExpense, totalRecurringIncome, pctOfExpense }
}

// ── 5. Insights automáticos ───────────────────────────────────────────────
function monthlyProfitSeries(historicalExpenses, historicalIncomes) {
  const expByMonth = groupByMonth(historicalExpenses)
  const incByMonth = groupByMonth(historicalIncomes)
  const keys = Array.from(new Set([...Object.keys(expByMonth), ...Object.keys(incByMonth)])).sort()
  return keys.map((key) => ({ key, profit: (incByMonth[key] ?? 0) - (expByMonth[key] ?? 0) }))
}

function currentStreak(series) {
  if (!series.length) return { count: 0, positive: true }
  const positive = series[series.length - 1].profit >= 0
  let count = 0
  for (let i = series.length - 1; i >= 0; i--) {
    if ((series[i].profit >= 0) !== positive) break
    count++
  }
  return { count, positive }
}

export function getAutoInsights({ expenses, prevExpenses, historicalExpenses, historicalIncomes }) {
  const insights = []

  const byCategory = {}
  expenses.forEach((e) => {
    const key = e.category?.name ?? 'Sin categoría'
    byCategory[key] = (byCategory[key] ?? 0) + Number(e.amount)
  })
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  if (topCategory) {
    insights.push({
      id: 'top-category',
      text: `Tu categoría con más gasto este mes es ${topCategory[0]} (${formatCurrency(topCategory[1])})`,
    })
  }

  const totalThisMonth = sum(expenses)
  const totalPrevMonth = sum(prevExpenses)
  const change = percentChange(totalThisMonth, totalPrevMonth)
  if (change !== null) {
    insights.push({
      id: 'month-change',
      text: change >= 0
        ? `Gastaste ${change}% más que el mes pasado (${formatCurrency(totalThisMonth)} vs ${formatCurrency(totalPrevMonth)})`
        : `Gastaste ${Math.abs(change)}% menos que el mes pasado (${formatCurrency(totalThisMonth)} vs ${formatCurrency(totalPrevMonth)})`,
    })
  }

  const biggest = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0]
  if (biggest) {
    const suffix = biggest.description ? ` (${biggest.description})` : ''
    insights.push({
      id: 'biggest-expense',
      text: `Tu gasto más grande del mes fue ${formatCurrency(biggest.amount)} en ${biggest.category?.name ?? 'sin categoría'}${suffix}`,
    })
  }

  const streak = currentStreak(monthlyProfitSeries(historicalExpenses, historicalIncomes))
  if (streak.count >= 2) {
    insights.push({
      id: 'streak',
      text: streak.positive
        ? `Llevas ${streak.count} meses seguidos ahorrando (ingresos > gastos)`
        : `Llevas ${streak.count} meses seguidos gastando más de lo que ingresa`,
    })
  }

  return insights
}
