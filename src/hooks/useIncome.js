import { useEffect } from 'react'
import { useStore, selectTotalIncome } from '@/store'
import { useMonthFilter } from './useMonthFilter'

// `range` ({from, to}) sustituye al mes activo cuando se pasa.
export function useIncome(range) {
  const month = useMonthFilter()
  const from = range?.from ?? month.from
  const to   = range?.to   ?? month.to

  const incomes       = useStore((s) => s.incomes)
  const loading       = useStore((s) => s.incomesLoading)
  const error         = useStore((s) => s.incomesError)
  const totalIncome   = useStore(selectTotalIncome)
  const fetchIncomes  = useStore((s) => s.fetchIncomes)
  const addIncome     = useStore((s) => s.addIncome)
  const updateIncome  = useStore((s) => s.updateIncome)
  const removeIncome  = useStore((s) => s.removeIncome)
  const updateManyIncomes = useStore((s) => s.updateManyIncomes)
  const addTagToIncomes   = useStore((s) => s.addTagToIncomes)
  const removeManyIncomes = useStore((s) => s.removeManyIncomes)

  useEffect(() => {
    fetchIncomes(from, to)
  }, [from, to])

  const refetch = () => fetchIncomes(from, to)

  return {
    incomes, loading, error, totalIncome, from, to,
    addIncome, updateIncome, removeIncome, updateManyIncomes, addTagToIncomes, removeManyIncomes, refetch,
  }
}
