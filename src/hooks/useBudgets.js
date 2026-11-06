import { useEffect, useMemo } from 'react'
import { useStore } from '@/store'
import { useMonthFilter } from './useMonthFilter'
import {
  getBudgetReferenceDate, getBudgetsRange, summarizeBudgets, withBudgetStatus,
} from '@/lib/budgetStatus'

export function useBudgets() {
  const { activeMonth } = useMonthFilter()
  const budgets             = useStore((s) => s.budgets)
  const budgetExpenses      = useStore((s) => s.budgetExpenses)
  const loading             = useStore((s) => s.budgetsLoading)
  const fetchBudgets        = useStore((s) => s.fetchBudgets)
  const fetchBudgetExpenses = useStore((s) => s.fetchBudgetExpenses)
  const addBudget           = useStore((s) => s.addBudget)
  const updateBudget        = useStore((s) => s.updateBudget)
  const removeBudget        = useStore((s) => s.removeBudget)

  useEffect(() => {
    fetchBudgets()
  }, [])

  const refDate = useMemo(() => getBudgetReferenceDate(activeMonth), [activeMonth])
  const range   = useMemo(() => getBudgetsRange(budgets, refDate), [budgets, refDate])

  // Recarga también al editar un presupuesto (una categoría o un período nuevos
  // necesitan gastos que aún no se han traído) y cuando cambian los gastos: el
  // registro rápido o deshacer un borrado ocurren estando en esta misma pantalla.
  const coverage = budgets.map((b) => `${b.period}:${[...(b.category_ids ?? [])].sort()}`).sort().join('|')
  const expenses = useStore((s) => s.expenses)
  useEffect(() => {
    if (range) fetchBudgetExpenses(range.from, range.to)
  }, [coverage, range?.from, range?.to, expenses])

  const budgetsWithStatus = useMemo(
    () => budgets.map((b) => withBudgetStatus(b, budgetExpenses, refDate)),
    [budgets, budgetExpenses, refDate],
  )
  const summary = useMemo(
    () => summarizeBudgets(budgetsWithStatus, budgetExpenses),
    [budgetsWithStatus, budgetExpenses],
  )

  return { budgets: budgetsWithStatus, summary, loading, addBudget, updateBudget, removeBudget }
}
