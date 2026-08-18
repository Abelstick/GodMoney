import { useState, useEffect, useMemo } from 'react'
import { incomeService }  from '@/services/incomeService'
import { expenseService } from '@/services/expenseService'
import { useGoals } from './useGoals'
import {
  buildChartData,
  smoothedSeries,
  simpleMean,
  monthsToGoal,
  percentChange,
} from '@/features/predictions/utils/predictionAlgorithms'
import { MONTHS_HISTORY } from '@/lib/constants'

export function usePredictions() {
  const [incomeRows,  setIncomeRows]  = useState([])
  const [expenseRows, setExpenseRows] = useState([])
  const [loading, setLoading] = useState(true)

  const { goals } = useGoals()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      incomeService.getHistorical(MONTHS_HISTORY),
      expenseService.getHistorical(MONTHS_HISTORY),
    ]).then(([inc, exp]) => {
      setIncomeRows(inc)
      setExpenseRows(exp)
      setLoading(false)
    })
  }, [])

  const chartData = useMemo(() => {
    if (!incomeRows.length && !expenseRows.length) return []
    const raw = buildChartData(incomeRows, expenseRows, 3)
    return smoothedSeries(raw, 'expense', 3)
  }, [incomeRows, expenseRows])

  // Proyecciones puntuales (para tarjetas de resumen)
  const projectedIncome  = useMemo(() => {
    const proj = chartData.filter((d) => d.projected)
    return proj.length ? proj[0].income : 0
  }, [chartData])

  const projectedExpense = useMemo(() => {
    const proj = chartData.filter((d) => d.projected)
    return proj.length ? proj[0].expense : 0
  }, [chartData])

  const projectedProfit  = projectedIncome - projectedExpense

  const historicalData = useMemo(() => chartData.filter((d) => !d.projected), [chartData])
  const monthsOfData    = historicalData.length

  // Ahorro mensual promedio histórico (profit medio real)
  const avgMonthlySaving = useMemo(() => {
    if (!historicalData.length) return 0
    return simpleMean(historicalData.map((d) => d.profit))
  }, [historicalData])

  const avgHistoricalIncome  = useMemo(() => (
    historicalData.length ? simpleMean(historicalData.map((d) => d.income)) : 0
  ), [historicalData])

  const avgHistoricalExpense = useMemo(() => (
    historicalData.length ? simpleMean(historicalData.map((d) => d.expense)) : 0
  ), [historicalData])

  // Variación de la proyección respecto al promedio histórico (para las flechas de tendencia)
  const incomeTrend  = percentChange(projectedIncome, avgHistoricalIncome)
  const expenseTrend = percentChange(projectedExpense, avgHistoricalExpense)
  const profitTrend  = percentChange(projectedProfit, avgMonthlySaving)

  // Proyección de objetivos: cuántos meses faltan
  const goalsProjection = useMemo(() =>
    goals.map((g) => ({
      ...g,
      monthsLeft: monthsToGoal(
        g.current_amount,
        g.target_amount,
        avgMonthlySaving > 0 ? avgMonthlySaving : projectedProfit
      ),
    })),
    [goals, avgMonthlySaving, projectedProfit]
  )

  return {
    loading,
    chartData,
    monthsOfData,
    projectedIncome,
    projectedExpense,
    projectedProfit,
    avgMonthlySaving,
    incomeTrend,
    expenseTrend,
    profitTrend,
    goalsProjection,
  }
}
