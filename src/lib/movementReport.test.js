import { describe, it, expect } from 'vitest'
import { summarize, isCalendarMonth, budgetRows, buildReport, renderReportHTML } from './movementReport'

const food = { id: 'c-food', name: 'Comida' }
const rent = { id: 'c-rent', name: 'Alquiler' }
const save = { id: 'c-save', name: 'Ahorro', is_savings: true }
const pay  = { id: 'c-pay', name: 'Sueldo' }

const mv = (kind, amount, category, extra = {}) => ({
  kind, amount, category, category_id: category?.id ?? null, date: '2026-10-05', description: '', tags: [], ...extra,
})

const current = [
  mv('income', '3000', pay),
  mv('expense', '500', rent, { description: 'Octubre' }),
  mv('expense', '200', food),
  mv('expense', '100', food),
  mv('expense', '300', save),
]

describe('summarize', () => {
  const s = summarize(current)

  it('suma ingresos, gastos y neto', () => {
    expect(s).toMatchObject({ income: 3000, expense: 1100, net: 1900, count: 5 })
  })

  it('separa el ahorro del consumo', () => {
    expect(s.savings).toBe(300)
    expect(s.consumption).toBe(800)
    expect(s.savingsRate).toBe(10)
  })

  it('sin ingresos no hay tasa de ahorro', () => {
    expect(summarize([mv('expense', 50, save)]).savingsRate).toBeNull()
  })

  it('agrupa por categoría de mayor a menor y cuenta movimientos', () => {
    // Comida y Ahorro empatan en 300: gana el que apareció primero en los datos.
    expect(s.expenseByCategory.map((r) => [r.name, r.total, r.count])).toEqual([
      ['Alquiler', 500, 1], ['Comida', 300, 2], ['Ahorro', 300, 1],
    ])
    expect(s.incomeByCategory).toEqual([{ name: 'Sueldo', total: 3000, count: 1 }])
  })

  it('un movimiento sin categoría va a "Sin categoría"', () => {
    expect(summarize([mv('expense', 10, null)]).expenseByCategory[0].name).toBe('Sin categoría')
  })

  it('una lista vacía da ceros', () => {
    expect(summarize([])).toMatchObject({ income: 0, expense: 0, net: 0, count: 0, savings: 0, consumption: 0 })
  })
})

describe('isCalendarMonth', () => {
  it('reconoce un mes completo, incluido febrero y bisiesto', () => {
    expect(isCalendarMonth({ from: '2026-10-01', to: '2026-10-31' })).toBe(true)
    expect(isCalendarMonth({ from: '2026-02-01', to: '2026-02-28' })).toBe(true)
    expect(isCalendarMonth({ from: '2028-02-01', to: '2028-02-29' })).toBe(true)
  })

  it('rechaza rangos parciales, de varios meses o ausentes', () => {
    expect(isCalendarMonth({ from: '2026-10-01', to: '2026-10-30' })).toBe(false)
    expect(isCalendarMonth({ from: '2026-10-02', to: '2026-10-31' })).toBe(false)
    expect(isCalendarMonth({ from: '2026-09-01', to: '2026-10-31' })).toBe(false)
    expect(isCalendarMonth({ from: '2026-02-01', to: '2026-02-29' })).toBe(false)
    expect(isCalendarMonth(undefined)).toBe(false)
  })
})

describe('budgetRows', () => {
  const budgets = [
    { name: 'Hogar', amount: '600', period: 'monthly', category_ids: ['c-rent', 'c-food'], categories: [rent, food] },
    { name: 'Semanal', amount: '50', period: 'weekly', category_ids: ['c-food'], categories: [food] },
    { name: 'Sin categorías', amount: '100', period: 'monthly', category_ids: [], categories: [] },
  ]

  it('suma las categorías del grupo y calcula porcentaje y estado', () => {
    const [home] = budgetRows(budgets, current)
    expect(home).toMatchObject({ name: 'Hogar', amount: 600, spent: 800, percent: 133, status: 'exceeded' })
    expect(home.categories).toEqual(['Alquiler', 'Comida'])
  })

  it('solo incluye presupuestos mensuales y los ordena del más usado al menos', () => {
    const rows = budgetRows(budgets, current)
    expect(rows.map((r) => r.name)).toEqual(['Hogar', 'Sin categorías'])
    expect(rows[1]).toMatchObject({ spent: 0, percent: 0, status: 'normal' })
  })

  it('los ingresos no cuentan como gasto de un presupuesto', () => {
    const [row] = budgetRows([{ name: 'X', amount: 100, period: 'monthly', category_ids: ['c-pay'] }], current)
    expect(row.spent).toBe(0)
  })
})

describe('buildReport', () => {
  const previous = [mv('income', '2500', pay), mv('expense', '400', rent), mv('expense', '200', food)]
  const range = { from: '2026-10-01', to: '2026-10-31' }

  it('sin periodo anterior no hay variaciones', () => {
    const report = buildReport({ movements: current, range })
    expect(report.delta).toBeNull()
    expect(report.expenseByCategory[0]).not.toHaveProperty('delta')
  })

  it('calcula variaciones totales y por categoría', () => {
    const report = buildReport({ movements: current, previous, range })
    expect(report.delta.income).toBe(20)        // 3000 vs 2500
    expect(report.delta.expense).toBe(83)       // 1100 vs 600
    const rentRow = report.expenseByCategory.find((r) => r.name === 'Alquiler')
    expect(rentRow).toMatchObject({ previous: 400, delta: 25 })
    const saveRow = report.expenseByCategory.find((r) => r.name === 'Ahorro')
    expect(saveRow).toMatchObject({ previous: 0, delta: null })   // categoría nueva
  })

  it('los mayores gastos excluyen el ahorro y vienen de mayor a menor', () => {
    const { topExpenses } = buildReport({ movements: current, range })
    expect(topExpenses.map((m) => Number(m.amount))).toEqual([500, 200, 100])
  })

  it('limita los mayores gastos a cinco', () => {
    const many = Array.from({ length: 8 }, (_, i) => mv('expense', 10 + i, food))
    expect(buildReport({ movements: many, range }).topExpenses).toHaveLength(5)
  })

  it('muestra presupuestos solo si el rango es un mes completo', () => {
    const budgets = [{ name: 'Hogar', amount: 600, period: 'monthly', category_ids: ['c-rent'], categories: [rent] }]
    expect(buildReport({ movements: current, budgets, range }).budgets).toHaveLength(1)
    expect(buildReport({ movements: current, budgets, range: { from: '2026-10-01', to: '2026-10-15' } }).budgets).toBeNull()
    expect(buildReport({ movements: current, range }).budgets).toBeNull()
  })

  it('los presupuestos usan todos los gastos aunque la lista del informe esté filtrada', () => {
    const budgets = [{ name: 'Hogar', amount: 600, period: 'monthly', category_ids: ['c-rent'], categories: [rent] }]
    const onlyFood = current.filter((m) => m.category?.id === 'c-food')
    const report = buildReport({ movements: onlyFood, allMovements: current, budgets, range })
    expect(report.budgets[0].spent).toBe(500)
  })
})

describe('renderReportHTML', () => {
  const range = { from: '2026-10-01', to: '2026-10-31' }
  const options = { title: 'Reporte', periodLabel: 'oct 2026', previousLabel: 'sep 2026' }

  it('incluye las secciones principales', () => {
    const budgets = [{ name: 'Hogar', amount: 600, period: 'monthly', category_ids: ['c-rent'], categories: [rent] }]
    const report = buildReport({ movements: current, previous: current, budgets, range })
    const html = renderReportHTML(report, current, options)
    for (const text of ['Gastos por categoría', 'Ingresos por categoría', 'Presupuestos del mes', 'Mayores gastos', 'Detalle de movimientos', 'Variaciones frente a sep 2026', 'Ahorrado']) {
      expect(html).toContain(text)
    }
  })

  it('sin comparativa ni presupuestos omite esas secciones', () => {
    const report = buildReport({ movements: [mv('expense', 10, food)], range: { from: '2026-10-01', to: '2026-10-10' } })
    const html = renderReportHTML(report, [mv('expense', 10, food)], options)
    expect(html).not.toContain('Variaciones frente a')
    expect(html).not.toContain('Presupuestos del mes')
    expect(html).not.toContain('vs anterior')
    expect(html).not.toContain('Ahorrado')
  })

  it('escapa el texto del usuario para que no inyecte HTML', () => {
    const evil = [mv('expense', 10, { id: 'x', name: '<script>alert(1)</script>' }, { description: '"><img src=x onerror=alert(1)>', tags: ['<b>'] })]
    const html = renderReportHTML(buildReport({ movements: evil, range }), evil, { ...options, title: '<i>t</i>' })
    expect(html).not.toContain('<script>alert')
    expect(html).not.toContain('<img src=x')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('pinta rojo lo malo y verde lo bueno según el tipo de movimiento', () => {
    const up = [mv('income', 200, pay), mv('expense', 200, food)]
    const before = [mv('income', 100, pay), mv('expense', 100, food)]
    const html = renderReportHTML(buildReport({ movements: up, previous: before, range }), up, options)
    expect(html).toContain('<span class="d good">▲ 100%</span>') // más ingresos: bueno
    expect(html).toContain('<span class="d bad">▲ 100%</span>')  // más gastos: malo
  })
})
