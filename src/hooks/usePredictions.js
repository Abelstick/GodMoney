import { useState, useEffect, useMemo } from 'react'
import { incomeService }  from '@/services/incomeService'
import { expenseService } from '@/services/expenseService'
import { useGoals } from './useGoals'
import {
  buildChartData,
  smoothedSeries,
  simpleMean,
  monthsToGoal,
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

  // Ahorro mensual promedio histórico (profit medio real)
  const avgMonthlySaving = useMemo(() => {
    const historical = chartData.filter((d) => !d.projected)
    if (!historical.length) return 0
    return simpleMean(historical.map((d) => d.profit))
  }, [chartData])

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
    projectedIncome,
    projectedExpense,
    projectedProfit,
    avgMonthlySaving,
    goalsProjection,
  }
}
