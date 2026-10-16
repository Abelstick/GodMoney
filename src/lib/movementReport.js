import { buildCSV, downloadFile } from '@/lib/csv'
import { formatCurrency, formatDate } from '@/lib/formatters'

const catName = (m) => m.category?.name ?? 'Sin categoría'

export function summarize(movements) {
  let income = 0
  let expense = 0
  const byCategory = { expense: new Map(), income: new Map() }

  for (const m of movements) {
    const amount = Number(m.amount)
    if (m.kind === 'income') income += amount
    else expense += amount
    const map = byCategory[m.kind]
    const key = catName(m)
    const prev = map.get(key) ?? { name: key, total: 0, count: 0 }
    prev.total += amount
    prev.count += 1
    map.set(key, prev)
  }

  const sorted = (map) => [...map.values()].sort((a, b) => b.total - a.total)
  return {
    income, expense, net: income - expense, count: movements.length,
    expenseByCategory: sorted(byCategory.expense),
    incomeByCategory:  sorted(byCategory.income),
  }
}

export function exportMovementsCSV(movements, filename) {
  const header = ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto', 'Etiquetas', 'Nota', 'Adjuntos']
  const rows = movements.map((m) => [
    m.date,
    m.kind === 'income' ? 'Ingreso' : 'Gasto',
    m.description ?? '',
    catName(m),
    // Gastos en negativo para que la suma de la columna dé el neto
    (m.kind === 'income' ? 1 : -1) * Number(m.amount),
    (m.tags ?? []).join(' '),
    m.notes ?? '',
    (m.attachments ?? []).map((a) => a.link).join(' '),
  ])
  downloadFile(buildCSV([header, ...rows]), filename)
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function categoryTable(title, rows, total) {
  if (!rows.length) return ''
  return `
    <h2>${esc(title)}</h2>
    <table>
      <thead><tr><th>Categoría</th><th class="n">Movs.</th><th class="n">Monto</th><th class="n">%</th></tr></thead>
      <tbody>
        ${rows.map((r) => `<tr><td>${esc(r.name)}</td><td class="n">${r.count}</td><td class="n">${esc(formatCurrency(r.total))}</td><td class="n">${total ? Math.round((r.total / total) * 100) : 0}%</td></tr>`).join('')}
      </tbody>
    </table>`
}

/**
 * Genera el reporte como HTML imprimible y abre el diálogo de impresión
 * (el usuario elige "Guardar como PDF"). No requiere dependencias.
 */
export function printMovementsReport(movements, { title, periodLabel }) {
  const s = summarize(movements)
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Inter, -apple-system, 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 22px 0 6px; }
  .sub { color: #475569; margin: 0 0 16px; }
  .cards { display: flex; gap: 10px; margin-bottom: 4px; }
  .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
  .card span { display: block; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  .card strong { font-size: 15px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #94a3b8; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tag { color: #475569; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  footer { margin-top: 18px; color: #64748b; font-size: 9px; }
</style></head><body>
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(periodLabel)} · ${s.count} movimientos · GodMoney</p>
  <div class="cards">
    <div class="card"><span>Ingresos</span><strong>${esc(formatCurrency(s.income))}</strong></div>
    <div class="card"><span>Gastos</span><strong>${esc(formatCurrency(s.expense))}</strong></div>
    <div class="card"><span>Neto</span><strong>${esc(formatCurrency(s.net))}</strong></div>
  </div>
  ${categoryTable('Gastos por categoría', s.expenseByCategory, s.expense)}
  ${categoryTable('Ingresos por categoría', s.incomeByCategory, s.income)}
  <h2>Detalle de movimientos</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Categoría</th><th class="n">Monto</th></tr></thead>
    <tbody>
      ${movements.map((m) => `<tr>
        <td class="n">${esc(formatDate(m.date))}</td>
        <td>${m.kind === 'income' ? 'Ingreso' : 'Gasto'}</td>
        <td>${esc(m.description ?? '')}${(m.tags ?? []).length ? ` <span class="tag">${esc(m.tags.map((t) => '#' + t).join(' '))}</span>` : ''}</td>
        <td>${esc(catName(m))}</td>
        <td class="n">${m.kind === 'income' ? '+' : '-'}${esc(formatCurrency(m.amount))}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <footer>Generado el ${esc(formatDate(new Date()))}</footer>
</body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow.document
  doc.open(); doc.write(html); doc.close()

  const cleanup = () => setTimeout(() => iframe.remove(), 1000)
  iframe.contentWindow.onafterprint = cleanup
  // Pequeña espera para que el iframe termine de pintar antes de imprimir
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    setTimeout(cleanup, 60_000)
  }, 250)
}
