import { useEffect, useState } from 'react'
import { subMonths } from 'date-fns'
import { expenseService } from '@/services/expenseService'
import { incomeService }  from '@/services/incomeService'
import { budgetService }  from '@/services/budgetService'
import { getMonthRange }  from '@/lib/formatters'
import { MONTHS_HISTORY } from '@/lib/constants'
import {
  buildBudgetsWithSpent,
  getMonthEndProjection,
  getDailyAvailable,
  getSmartAlerts,
  getRecurringSummary,
  getAutoInsights,
} from '@/features/insights/utils/insightsEngine'

const EMPTY = {
  loading: true,
  projection: null,
  dailyAvailable: null,
  alerts: [],
  recurring: null,
  autoInsights: [],
}

// Los 5 widgets de Fase 1 son sobre el mes calendario real (días transcurridos/
// restantes), por lo que se hace fetch directo a los servicios en vez de usar
// useMonthFilter — igual que Dashboard.jsx hace para su gráfico histórico.
export function useInsights() {
  const [data, setData] = useState(EMPTY)

  useEffect(() => {
    let cancelled = false
    const today = new Date()
    const { from, to } = getMonthRange(today)
    const { from: prevFrom, to: prevTo } = getMonthRange(subMonths(today, 1))

    async function load() {
      const [expenses, incomes, prevExpenses, historicalExpenses, historicalIncomes, budgets] =
        await Promise.all([
          expenseService.getByMonth(from, to),
          incomeService.getByMonth(from, to),
          expenseService.getByMonth(prevFrom, prevTo),
          expenseService.getHistorical(MONTHS_HISTORY),
          incomeService.getHistorical(MONTHS_HISTORY),
          budgetService.getAll(),
        ])

      const categoryIds = budgets.map((b) => b.category_id).filter(Boolean)
      const spentByCategory = await budgetService.getSpentByCategory(categoryIds, from, to)
      const budgetsWithSpent = buildBudgetsWithSpent(budgets, spentByCategory)

      const projection     = getMonthEndProjection({ today, expenses, incomes, historicalExpenses })
      const dailyAvailable = getDailyAvailable({ today, incomes, expenses, budgetsWithSpent })
      const alerts         = getSmartAlerts({ today, projection, dailyAvailable, budgetsWithSpent, expenses, historicalExpenses })
      const recurring       = getRecurringSummary({ expenses, incomes })
      const autoInsights    = getAutoInsights({ expenses, prevExpenses, historicalExpenses, historicalIncomes })

      if (!cancelled) {
        setData({ loading: false, projection, dailyAvailable, alerts, recurring, autoInsights })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return data
}
