import { useEffect } from 'react'
import { useStore, selectTotalExpense } from '@/store'
import { useMonthFilter } from './useMonthFilter'

export function useExpenses() {
  const { from, to } = useMonthFilter()

  const expenses       = useStore((s) => s.expenses)
  const loading        = useStore((s) => s.expensesLoading)
  const error          = useStore((s) => s.expensesError)
  const totalExpense   = useStore(selectTotalExpense)
  const fetchExpenses  = useStore((s) => s.fetchExpenses)
  const addExpense     = useStore((s) => s.addExpense)
  const updateExpense  = useStore((s) => s.updateExpense)
  const removeExpense  = useStore((s) => s.removeExpense)

  useEffect(() => {
    fetchExpenses(from, to)
  }, [from, to])

  return { expenses, loading, error, totalExpense, addExpense, updateExpense, removeExpense }
}
