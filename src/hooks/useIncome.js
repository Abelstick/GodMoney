import { useEffect } from 'react'
import { useStore, selectTotalIncome } from '@/store'
import { useMonthFilter } from './useMonthFilter'

export function useIncome() {
  const { from, to } = useMonthFilter()

  const incomes       = useStore((s) => s.incomes)
  const loading       = useStore((s) => s.incomesLoading)
  const error         = useStore((s) => s.incomesError)
  const totalIncome   = useStore(selectTotalIncome)
  const fetchIncomes  = useStore((s) => s.fetchIncomes)
  const addIncome     = useStore((s) => s.addIncome)
  const updateIncome  = useStore((s) => s.updateIncome)
  const removeIncome  = useStore((s) => s.removeIncome)

  useEffect(() => {
    fetchIncomes(from, to)
  }, [from, to])

  return { incomes, loading, error, totalIncome, addIncome, updateIncome, removeIncome }
}
