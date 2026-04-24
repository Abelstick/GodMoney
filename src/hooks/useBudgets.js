import { useEffect } from 'react'
import { useStore } from '@/store'
import { useMonthFilter } from './useMonthFilter'

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

  const budgetsWithSpent = budgets.map((b) => ({
    ...b,
    spent: budgetsSpent[b.category_id] ?? 0,
    remaining: Math.max(b.amount - (budgetsSpent[b.category_id] ?? 0), 0),
    percent: Math.min(
      Math.round(((budgetsSpent[b.category_id] ?? 0) / b.amount) * 100),
      100
    ),
  }))

  return { budgets: budgetsWithSpent, loading, addBudget, updateBudget, removeBudget }
}
