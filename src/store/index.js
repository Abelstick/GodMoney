import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createUiSlice }      from './slices/uiSlice'
import { createIncomeSlice }  from './slices/incomeSlice'
import { createExpenseSlice } from './slices/expenseSlice'
import { createGoalSlice }    from './slices/goalSlice'
import { createBudgetSlice }  from './slices/budgetSlice'

/*
 * Composición del store con el patrón de slices de Zustand.
 * Cada slice es autónomo y se une aquí. Esto permite:
 *   - Escalar features sin modificar el store raíz
 *   - Testing unitario de cada slice de forma aislada
 *   - Depuración con Redux DevTools (devtools wrapper)
 */
export const useStore = create(
  devtools(
    (set, get) => ({
      ...createUiSlice(set, get),
      ...createIncomeSlice(set, get),
      ...createExpenseSlice(set, get),
      ...createGoalSlice(set, get),
      ...createBudgetSlice(set, get),
    }),
    { name: 'GodMoney' }
  )
)

// Selectores derivados (evitan re-renders innecesarios)
export const selectTotalIncome  = (s) => s.incomes.reduce((acc, i) => acc + Number(i.amount), 0)
export const selectTotalExpense = (s) => s.expenses.reduce((acc, e) => acc + Number(e.amount), 0)
export const selectProfit       = (s) => selectTotalIncome(s) - selectTotalExpense(s)
