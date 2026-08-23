import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createUiSlice }      from './slices/uiSlice'
import { createIncomeSlice }  from './slices/incomeSlice'
import { createExpenseSlice } from './slices/expenseSlice'
import { createGoalSlice }    from './slices/goalSlice'
import { createBudgetSlice }  from './slices/budgetSlice'
import { createAccountSlice } from './slices/accountSlice'
import { createLoanSlice }    from './slices/loanSlice'
import { createGoalLinkSlice } from './slices/goalLinkSlice'

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
      ...createAccountSlice(set, get),
      ...createLoanSlice(set, get),
      ...createGoalLinkSlice(set, get),
    }),
    { name: 'GodMoney' }
  )
)

// Selectores derivados (evitan re-renders innecesarios)
export const selectTotalIncome  = (s) => s.incomes.reduce((acc, i) => acc + Number(i.amount), 0)
export const selectTotalExpense = (s) => s.expenses.reduce((acc, e) => acc + Number(e.amount), 0)
export const selectProfit       = (s) => selectTotalIncome(s) - selectTotalExpense(s)

// ── Patrimonio (cuentas + préstamos) ──
// "Dinero disponible" solo refleja lo que pasó por accounts.balance (saldo
// inicial + movimientos de préstamos). Ingresos/gastos normales no tocan
// cuentas todavía, así que no se sumen aquí para no inflar el disponible.
export const selectAvailableMoney = (s) => s.accounts.reduce((acc, a) => acc + Number(a.balance), 0)
export const selectReceivable = (s) =>
  s.loans
    .filter((l) => l.type === 'LENT' && l.status !== 'CANCELLED' && l.status !== 'PAID')
    .reduce((acc, l) => acc + Number(l.remaining_principal) + Number(l.remaining_interest), 0)
export const selectPayable = (s) =>
  s.loans
    .filter((l) => l.type === 'BORROWED' && l.status !== 'CANCELLED' && l.status !== 'PAID')
    .reduce((acc, l) => acc + Number(l.remaining_principal) + Number(l.remaining_interest), 0)
export const selectNetWorth = (s) => selectAvailableMoney(s) + selectReceivable(s) - selectPayable(s)
