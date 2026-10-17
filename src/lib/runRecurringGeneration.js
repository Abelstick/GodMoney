import { useStore } from '@/store'
import { recurringTransactionService } from '@/services/recurringTransactionService'

// Pide a la base de datos que cree los gastos/ingresos recurrentes vencidos y,
// si creó alguno, refresca las listas que se están viendo. Si la migración 013
// aún no está aplicada la llamada falla y simplemente no se hace nada.
export async function runRecurringGeneration() {
  let created = 0
  try {
    created = await recurringTransactionService.generate()
  } catch (err) {
    console.warn('No se pudieron generar los movimientos recurrentes:', err.message)
    return 0
  }
  if (created > 0) {
    const s = useStore.getState()
    if (s.expensesRange) s.fetchExpenses(s.expensesRange.from, s.expensesRange.to)
    if (s.incomesRange)  s.fetchIncomes(s.incomesRange.from, s.incomesRange.to)
    s.fetchAccounts?.()
    s.showToast(`Se registraron ${created} movimiento${created !== 1 ? 's' : ''} automático${created !== 1 ? 's' : ''}`, 'success')
  }
  return created
}
