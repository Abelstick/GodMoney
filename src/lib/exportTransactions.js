export function exportTransactionsCSV(items, { filename, flagLabel, flagValue }) {
  const header = ['Fecha', 'Descripción', 'Categoría', 'Monto', flagLabel]
  const rows = items.map((item) => [
    item.date,
    `"${(item.description ?? '').replace(/"/g, '""')}"`,
    item.category ? `"${item.category.name}"` : 'Sin categoría',
    Number(item.amount).toFixed(2),
    flagValue(item) ? 'Sí' : 'No',
  ])

  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
