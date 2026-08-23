// Ordenamiento compartido entre las listas de Ingresos y Gastos.
export const SORT_OPTIONS = [
  { value: 'created_at', label: 'Fecha de registro' },
  { value: 'alpha',      label: 'Alfabético' },
  { value: 'amount',     label: 'Monto' },
]

export function sortTransactions(items, sortBy, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1
  const arr = [...items]

  arr.sort((a, b) => {
    if (sortBy === 'alpha') {
      const nameA = (a.description || a.category?.name || '').toLowerCase()
      const nameB = (b.description || b.category?.name || '').toLowerCase()
      return nameA.localeCompare(nameB) * dir
    }
    if (sortBy === 'amount') {
      return (Number(a.amount) - Number(b.amount)) * dir
    }
    // 'created_at' por defecto
    return (new Date(a.created_at) - new Date(b.created_at)) * dir
  })

  return arr
}
