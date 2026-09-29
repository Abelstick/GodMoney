import { expenseService } from '@/services/expenseService'

// Los gastos de ahorro con cuenta destino mueven el saldo de esa cuenta vía
// trigger en BD; se refrescan las cuentas para que objetivos y patrimonio
// reflejen el cambio al instante.
function touchesAccount(...expenses) {
  return expenses.some((e) => e?.savings_account_id)
}

export const createExpenseSlice = (set, get) => ({
  expenses: [],
  expensesLoading: false,
  expensesError: null,

  fetchExpenses: async (from, to) => {
    set({ expensesLoading: true, expensesError: null })
    try {
      const data = await expenseService.getByMonth(from, to)
      set({ expenses: data, expensesLoading: false })
    } catch (err) {
      set({ expensesError: err.message, expensesLoading: false })
    }
  },

  addExpense: async (payload) => {
    const data = await expenseService.create(payload)
    set((s) => ({ expenses: [data, ...s.expenses] }))
    if (touchesAccount(data)) await get().fetchAccounts()
    get().showToast(touchesAccount(data) ? 'Ahorro registrado y sumado a la cuenta' : 'Gasto registrado', 'success')
    return data
  },

  updateExpense: async (id, payload) => {
    const previous = get().expenses.find((e) => e.id === id)
    const data = await expenseService.update(id, payload)
    set((s) => ({
      expenses: s.expenses.map((e) => (e.id === id ? data : e)),
    }))
    if (touchesAccount(previous, data)) await get().fetchAccounts()
    get().showToast('Gasto actualizado', 'success')
    return data
  },

  removeExpense: async (id) => {
    const previous = get().expenses.find((e) => e.id === id)
    await expenseService.remove(id)
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }))
    if (touchesAccount(previous)) await get().fetchAccounts()
    get().showToast('Gasto eliminado', 'info')
  },
})
