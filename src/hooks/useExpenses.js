import { useEffect } from 'react'
import { useStore, selectTotalExpense } from '@/store'
import { useMonthFilter } from './useMonthFilter'

// `range` ({from, to}) sustituye al mes activo cuando se pasa.
export function useExpenses(range) {
  const month = useMonthFilter()
  const from = range?.from ?? month.from
  const to   = range?.to   ?? month.to

  const expenses       = useStore((s) => s.expenses)
  const loading        = useStore((s) => s.expensesLoading)
  const error          = useStore((s) => s.expensesError)
  const totalExpense   = useStore(selectTotalExpense)
  const fetchExpenses  = useStore((s) => s.fetchExpenses)
  const addExpense     = useStore((s) => s.addExpense)
  const updateExpense  = useStore((s) => s.updateExpense)
  const removeExpense  = useStore((s) => s.removeExpense)
  const updateManyExpenses = useStore((s) => s.updateManyExpenses)
  const addTagToExpenses   = useStore((s) => s.addTagToExpenses)
  const removeManyExpenses = useStore((s) => s.removeManyExpenses)

  useEffect(() => {
    fetchExpenses(from, to)
  }, [from, to])

  const refetch = () => fetchExpenses(from, to)

  return {
    expenses, loading, error, totalExpense, from, to,
    addExpense, updateExpense, removeExpense, updateManyExpenses, addTagToExpenses, removeManyExpenses, refetch,
  }
}
