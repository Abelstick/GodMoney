// Ordenamiento compartido entre las listas de Ingresos y Gastos.
// `noun` es 'gasto' o 'ingreso' para etiquetar la fecha del movimiento.
export function getSortOptions(noun) {
  return [
    { value: 'date',       label: `Fecha del ${noun}` },
    { value: 'created_at', label: 'Fecha de registro' },
    { value: 'alpha',      label: 'Alfabético' },
    { value: 'amount',     label: 'Monto' },
  ]
}

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
    if (sortBy === 'date') {
      // `date` es YYYY-MM-DD; desempata por fecha de registro.
      const byDate = String(a.date).localeCompare(String(b.date))
      return (byDate || new Date(a.created_at) - new Date(b.created_at)) * dir
    }
    // 'created_at' por defecto
    return (new Date(a.created_at) - new Date(b.created_at)) * dir
  })

  return arr
}
