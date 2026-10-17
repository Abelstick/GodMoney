import { buildCSV, downloadFile } from '@/lib/csv'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { percentDelta } from '@/lib/dateRanges'
import { getBudgetStatus, BUDGET_STATUS_META } from '@/lib/budgetStatus'

const catName = (m) => m.category?.name ?? 'Sin categoría'
const isSavings = (m) => m.kind === 'expense' && Boolean(m.category?.is_savings)
const TOP_EXPENSES = 5

export function summarize(movements) {
  let income = 0
  let expense = 0
  let savings = 0
  const byCategory = { expense: new Map(), income: new Map() }

  for (const m of movements) {
    const amount = Number(m.amount)
    if (m.kind === 'income') income += amount
    else expense += amount
    if (isSavings(m)) savings += amount
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
    // Ahorro: sale del disponible pero no es consumo (igual que en el resto de la app).
    savings,
    consumption: expense - savings,
    savingsRate: income > 0 ? Math.round((savings / income) * 100) : null,
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

/** ¿El rango es exactamente un mes calendario? (solo entonces tiene sentido mostrar presupuestos). */
export function isCalendarMonth({ from, to } = {}) {
  if (!from || !to || from.slice(0, 7) !== to.slice(0, 7) || !from.endsWith('-01')) return false
  const [y, m] = from.split('-').map(Number)
  return to === `${from.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

function addPrevious(rows, previousRows) {
  const before = new Map(previousRows.map((r) => [r.name, r.total]))
  return rows.map((r) => {
    const prev = before.get(r.name) ?? 0
    return { ...r, previous: prev, delta: percentDelta(r.total, prev) }
  })
}

/**
 * Presupuestos mensuales con lo gastado en el mes, a partir de los gastos del
 * rango SIN filtrar (los filtros de la pantalla no deben alterar un presupuesto).
 */
export function budgetRows(budgets, allMovements) {
  const spentByCategory = {}
  for (const m of allMovements) {
    if (m.kind === 'expense' && m.category_id) {
      spentByCategory[m.category_id] = (spentByCategory[m.category_id] ?? 0) + Number(m.amount)
    }
  }
  return budgets
    .filter((b) => b.period === 'monthly')
    .map((b) => {
      const spent = (b.category_ids ?? []).reduce((acc, id) => acc + (spentByCategory[id] ?? 0), 0)
      const amount = Number(b.amount)
      return {
        name: b.name,
        categories: (b.categories ?? []).map((c) => c.name),
        amount,
        spent,
        percent: amount > 0 ? Math.round((spent / amount) * 100) : 0,
        status: getBudgetStatus(spent, amount),
      }
    })
    .sort((a, b) => b.percent - a.percent)
}

/**
 * Datos del informe, listos para dibujar.
 * - movements: los del filtro actual · previous: los del periodo anterior (mismos filtros)
 * - allMovements + budgets: solo se usan si el rango es un mes calendario
 */
export function buildReport({ movements, previous = null, budgets = null, allMovements = movements, range }) {
  const summary = summarize(movements)
  const prev = previous ? summarize(previous) : null

  const delta = prev && {
    income:      percentDelta(summary.income, prev.income),
    expense:     percentDelta(summary.expense, prev.expense),
    consumption: percentDelta(summary.consumption, prev.consumption),
    net:         percentDelta(summary.net, prev.net),
  }

  return {
    summary,
    previousSummary: prev,
    delta,
    expenseByCategory: prev ? addPrevious(summary.expenseByCategory, prev.expenseByCategory) : summary.expenseByCategory,
    incomeByCategory:  prev ? addPrevious(summary.incomeByCategory, prev.incomeByCategory) : summary.incomeByCategory,
    topExpenses: movements
      .filter((m) => m.kind === 'expense' && !isSavings(m))
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, TOP_EXPENSES),
    budgets: budgets && isCalendarMonth(range) ? budgetRows(budgets, allMovements) : null,
  }
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// ▲ rojo si lo malo sube; el signo de "bueno" depende de si es gasto o ingreso.
function deltaHTML(pct, { higherIsBetter }) {
  if (pct === null) return '<span class="d flat">nuevo</span>'
  if (pct === 0)    return '<span class="d flat">=</span>'
  const good = (pct > 0) === higherIsBetter
  return `<span class="d ${good ? 'good' : 'bad'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>`
}

function bar(percent, color = '#6366f1') {
  const width = Math.max(0, Math.min(100, percent))
  return `<div class="bar"><i style="width:${width}%;background:${color}"></i></div>`
}

const BUDGET_BAR_COLORS = { exceeded: '#dc2626', warning: '#d97706' }

function tagsHTML(m) {
  const tags = m.tags ?? []
  if (!tags.length) return ''
  return ' <span class="tag">' + esc(tags.map((t) => '#' + t).join(' ')) + '</span>'
}

function previousCell(row, higherIsBetter, withPrevious) {
  return withPrevious ? '<td class="n">' + deltaHTML(row.delta, { higherIsBetter }) + '</td>' : ''
}

// Línea bajo las tarjetas: gasto real vs ahorro (solo si hubo ahorro).
function savingsNote(report, cmp) {
  const { summary: s, delta } = report
  if (s.savings <= 0) return ''
  const change = cmp ? ' ' + deltaHTML(delta.consumption, { higherIsBetter: false }) : ''
  const rate = s.savingsRate === null ? '' : ' (' + s.savingsRate + '% de los ingresos)'
  return '<p class="note">Gasto real (sin ahorro): <b>' + esc(formatCurrency(s.consumption)) + '</b>' + change
    + ' · Ahorrado: <b>' + esc(formatCurrency(s.savings)) + '</b>' + rate + '</p>'
}

function categoryTable(title, rows, total, { higherIsBetter, withPrevious }) {
  if (!rows.length) return ''
  return `
    <h2>${esc(title)}</h2>
    <table>
      <thead><tr><th>Categoría</th><th class="n">Movs.</th><th class="n">Monto</th><th class="n">%</th><th class="bars"></th>${withPrevious ? '<th class="n">vs anterior</th>' : ''}</tr></thead>
      <tbody>
        ${rows.map((r) => {
          const pct = total ? Math.round((r.total / total) * 100) : 0
          return `<tr><td>${esc(r.name)}</td><td class="n">${r.count}</td><td class="n">${esc(formatCurrency(r.total))}</td><td class="n">${pct}%</td><td class="bars">${bar(pct)}</td>${previousCell(r, higherIsBetter, withPrevious)}</tr>`
        }).join('')}
      </tbody>
    </table>`
}

function card(label, value, deltaPct, opts) {
  const delta = deltaPct === undefined ? '' : deltaHTML(deltaPct, opts)
  return `<div class="card"><span>${esc(label)}</span><strong>${esc(value)}</strong>${delta}</div>`
}

/** HTML completo e imprimible del informe. */
export function renderReportHTML(report, movements, { title, periodLabel, previousLabel }) {
  const { summary: s, delta, previousSummary } = report
  const hasSavings = s.savings > 0
  const cmp = Boolean(previousSummary)
  const d = (key) => (cmp ? delta[key] : undefined)

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { margin: 16mm 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Inter, -apple-system, 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 13px; margin: 22px 0 6px; page-break-after: avoid; }
  .sub { color: #475569; margin: 0 0 16px; }
  .cards { display: flex; gap: 10px; margin-bottom: 4px; }
  .card { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; }
  .card span { display: block; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
  .card strong { font-size: 15px; margin-right: 6px; }
  .note { color: #475569; margin: 6px 0 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: middle; }
  th { font-size: 10px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #94a3b8; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tag { color: #475569; }
  .bars { width: 22%; }
  .bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
  .bar i { display: block; height: 100%; }
  .d { font-size: 10px; font-weight: 600; white-space: nowrap; }
  .d.good { color: #15803d; } .d.bad { color: #b91c1c; } .d.flat { color: #64748b; font-weight: 400; }
  .st-exceeded { color: #b91c1c; font-weight: 600; } .st-reached { color: #1d4ed8; font-weight: 600; } .st-warning { color: #b45309; font-weight: 600; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
  footer { margin-top: 18px; color: #64748b; font-size: 9px; }
</style></head><body>
  <h1>${esc(title)}</h1>
  <p class="sub">${esc(periodLabel)} · ${s.count} movimientos · GodMoney</p>
  <div class="cards">
    ${card('Ingresos', formatCurrency(s.income), d('income'), { higherIsBetter: true })}
    ${card(hasSavings ? 'Gasto total' : 'Gastos', formatCurrency(s.expense), d('expense'), { higherIsBetter: false })}
    ${card('Neto', formatCurrency(s.net), d('net'), { higherIsBetter: true })}
  </div>
  ${cmp ? `<p class="note">Variaciones frente a ${esc(previousLabel ?? 'el periodo anterior')} (con los mismos filtros).</p>` : ''}
  ${savingsNote(report, cmp)}
  ${categoryTable('Gastos por categoría', report.expenseByCategory, s.expense, { higherIsBetter: false, withPrevious: cmp })}
  ${categoryTable('Ingresos por categoría', report.incomeByCategory, s.income, { higherIsBetter: true, withPrevious: cmp })}
  ${report.budgets?.length ? `
    <h2>Presupuestos del mes</h2>
    <table>
      <thead><tr><th>Presupuesto</th><th>Categorías</th><th class="n">Límite</th><th class="n">Gastado</th><th class="n">%</th><th class="bars"></th><th>Estado</th></tr></thead>
      <tbody>
        ${report.budgets.map((b) => `<tr>
          <td>${esc(b.name)}</td>
          <td>${esc(b.categories.join(', ') || '—')}</td>
          <td class="n">${esc(formatCurrency(b.amount))}</td>
          <td class="n">${esc(formatCurrency(b.spent))}</td>
          <td class="n">${b.percent}%</td>
          <td class="bars">${bar(b.percent, BUDGET_BAR_COLORS[b.status])}</td>
          <td class="st-${esc(b.status)}">${esc(BUDGET_STATUS_META[b.status]?.label ?? '')}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}
  ${report.topExpenses.length ? `
    <h2>Mayores gastos</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Descripción</th><th>Categoría</th><th class="n">Monto</th></tr></thead>
      <tbody>
        ${report.topExpenses.map((m) => `<tr><td class="n">${esc(formatDate(m.date))}</td><td>${esc(m.description ?? '')}</td><td>${esc(catName(m))}</td><td class="n">-${esc(formatCurrency(m.amount))}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}
  <h2>Detalle de movimientos</h2>
  <table>
    <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Categoría</th><th class="n">Monto</th></tr></thead>
    <tbody>
      ${movements.map((m) => `<tr>
        <td class="n">${esc(formatDate(m.date))}</td>
        <td>${m.kind === 'income' ? 'Ingreso' : 'Gasto'}</td>
        <td>${esc(m.description ?? '')}${tagsHTML(m)}</td>
        <td>${esc(catName(m))}</td>
        <td class="n">${m.kind === 'income' ? '+' : '-'}${esc(formatCurrency(m.amount))}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <footer>Generado el ${esc(formatDate(new Date()))}</footer>
</body></html>`
}

/**
 * Genera el informe como HTML imprimible y abre el diálogo de impresión
 * (el usuario elige "Guardar como PDF"). No requiere dependencias.
 * Opciones: { title, periodLabel, previous, previousLabel, budgets, allMovements, range }
 */
export function printMovementsReport(movements, { title, periodLabel, previousLabel, ...data }) {
  const report = buildReport({ movements, ...data })
  const html = renderReportHTML(report, movements, { title, periodLabel, previousLabel })

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
