import { useEffect } from 'react'
import { useStore } from '@/store'
import { useMonthFilter } from './useMonthFilter'
import { getBudgetStatus } from '@/lib/budgetStatus'

export function useBudgets() {
  const { from, to } = useMonthFilter()
  const budgets             = useStore((s) => s.budgets)
  const budgetsSpent        = useStore((s) => s.budgetsSpent)
  const loading             = useStore((s) => s.budgetsLoading)
  const fetchBudgets        = useStore((s) => s.fetchBudgets)
  const fetchBudgetsSpent   = useStore((s) => s.fetchBudgetsSpent)
  const addBudget           = useStore((s) => s.addBudget)
  const updateBudget        = useStore((s) => s.updateBudget)
  const removeBudget        = useStore((s) => s.removeBudget)

  useEffect(() => {
    fetchBudgets()
  }, [])

  useEffect(() => {
    if (budgets.length) fetchBudgetsSpent(from, to)
  }, [budgets.length, from, to])

  const budgetsWithSpent = budgets.map((b) => {
    const spent  = budgetsSpent[b.category_id] ?? 0
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

  return { budgets: budgetsWithSpent, loading, addBudget, updateBudget, removeBudget }
}
