import { describe, it, expect } from 'vitest'
import { simulate, GENERAL_BUCKET } from './engine'
import { summarize, checkpoints, balanceOn, nextIncomeAfter } from './metrics'
import { runProjection } from './projection'
import { compareScenarios } from './comparison'
import { buildInsights, biggestPurchase } from './insights'
import { createEvent, createScenario, horizonEnd, normalizeScenario, parseQuickEntries, readAmountInput, scenarioReducer } from './scenarioModel'

const NOW = new Date(2026, 10, 2) // 2 nov 2026
const WINDOW = { from: '2026-11-02', to: '2026-12-02' }

const scenarioWith = (events, config = {}) => createScenario({
  config: { ...createScenario({}, NOW).config, initialBalance: '500', ...config },
  events: events.map((e) => createEvent(e, NOW)),
}, NOW)

// El ejemplo del requerimiento: sueldo, compra, servicios y otra compra.
const example = () => scenarioWith([
  { type: 'income',  description: 'Sueldo',    amount: '2600', date: '2026-11-07' },
  { type: 'expense', description: 'Compra',    amount: '900',  date: '2026-11-10' },
  { type: 'expense', description: 'Servicios', amount: '150',  date: '2026-11-15' },
  { type: 'expense', description: 'Extra',     amount: '300',  date: '2026-11-20' },
])

describe('simulate', () => {
  it('procesa los eventos en orden y da el saldo al cierre de cada día', () => {
    const result = simulate(example(), WINDOW)
    expect(result.initial).toBe(50000)
    expect(result.points).toHaveLength(31)
    expect(balanceOn(result, '2026-11-06')).toBe(50000)
    expect(balanceOn(result, '2026-11-07')).toBe(310000)
    expect(balanceOn(result, '2026-11-10')).toBe(220000)
    expect(balanceOn(result, '2026-11-15')).toBe(205000)
    expect(balanceOn(result, '2026-12-02')).toBe(175000)
  })

  it('el mismo día aplica primero los ingresos', () => {
    const result = simulate(scenarioWith([
      { type: 'expense', description: 'Gasto', amount: '700', date: '2026-11-05' },
      { type: 'income',  description: 'Pago',  amount: '300', date: '2026-11-05' },
    ]), WINDOW)
    const day = result.points.find((p) => p.date === '2026-11-05')
    expect(day.items.map((i) => i.type)).toEqual(['income', 'expense'])
    expect(day.items.map((i) => i.balanceAfter)).toEqual([80000, 10000])
    expect(day.inflow).toBe(30000)
    expect(day.outflow).toBe(70000)
  })

  it('admite saldo negativo', () => {
    const result = simulate(scenarioWith([{ type: 'expense', amount: '800', date: '2026-11-03' }]), WINDOW)
    expect(balanceOn(result, '2026-11-03')).toBe(-30000)
  })

  it('cuenta cada ocurrencia recurrente una sola vez', () => {
    const result = simulate(scenarioWith([
      { type: 'expense', description: 'Menú', amount: '10.50', date: '2026-11-02', repeat: 'daily' },
      { type: 'income',  description: 'Quincena', amount: '1300', date: '2026-11-15', repeat: 'biweekly' },
    ]), WINDOW)
    // 31 días de menú y quincenas el 15 y el 30 de noviembre
    expect(result.totals.expense).toBe(31 * 1050)
    expect(result.totals.income).toBe(2 * 130000)
    expect(result.points.at(-1).balance).toBe(50000 + 260000 - 31 * 1050)
  })

  it('ignora eventos desactivados o inválidos', () => {
    const scenario = scenarioWith([
      { type: 'expense', amount: '100', date: '2026-11-03', enabled: false },
      { type: 'expense', amount: '0', date: '2026-11-03' },
      { type: 'expense', amount: '50', date: 'mañana' },
    ])
    expect(simulate(scenario, WINDOW).points.at(-1).balance).toBe(50000)
  })

  it('ahorro y deuda salen del disponible; transferencia no cambia el total', () => {
    const scenario = scenarioWith([
      { type: 'saving',   amount: '100', date: '2026-11-03' },
      { type: 'debt',     amount: '50',  date: '2026-11-04' },
      { type: 'transfer', amount: '200', date: '2026-11-05', accountId: 'a', toAccountId: 'b' },
    ], { balanceMode: 'accounts', accountBalances: [{ accountId: 'a', amount: '400' }, { accountId: 'b', amount: '100' }] })
    const result = simulate(scenario, WINDOW)
    expect(result.initial).toBe(50000)
    expect(result.points.at(-1).balance).toBe(35000)
    expect(result.totals).toMatchObject({ saving: 10000, debt: 5000, transfer: 20000 })
    // Sin cuenta asignada, ahorro y deuda salen del cubo general
    expect(result.finalBuckets).toEqual({ a: 20000, b: 30000, [GENERAL_BUCKET]: -15000 })
  })

  it('evitar errores de redondeo con muchos montos decimales', () => {
    const result = simulate(scenarioWith([
      { type: 'expense', amount: '0.10', date: '2026-11-02', repeat: 'daily' },
    ], { initialBalance: '0.30' }), { from: '2026-11-02', to: '2026-11-04' })
    expect(result.points.at(-1).balance).toBe(0)
  })
})

describe('summarize y cortes', () => {
  it('indicadores principales', () => {
    const s = summarize(simulate(example(), WINDOW), { thresholdCents: 200000 })
    expect(s).toMatchObject({
      initial: 50000,
      income: 260000,
      outflow: 135000,
      final: 175000,
      variation: 125000,
      min: { balance: 50000, date: '2026-11-02' },
      firstNegativeDate: null,
      firstBelowThresholdDate: '2026-11-02',
    })
    // 1350 de 3100 disponibles en el periodo
    expect(s.committedPct).toBe(43.5)
  })

  it('mínimo y primer día en negativo', () => {
    const s = summarize(simulate(scenarioWith([
      { type: 'expense', amount: '900', date: '2026-11-04' },
      { type: 'income',  amount: '2600', date: '2026-11-07' },
    ]), WINDOW))
    expect(s.min).toEqual({ balance: -40000, date: '2026-11-04' })
    expect(s.firstNegativeDate).toBe('2026-11-04')
  })

  it('los cortes "Hoy" usan el saldo inicial y fuera del rango son null', () => {
    const cps = checkpoints(simulate(example(), WINDOW))
    expect(cps.map((c) => c.balance)).toEqual([50000, 310000, 205000, 175000, null])
  })

  it('runProjection siempre calcula hasta 60 días para los cortes', () => {
    const projection = runProjection(example(), { from: '2026-11-02', to: '2026-11-09' })
    expect(projection.points).toHaveLength(8)
    expect(projection.summary.final).toBe(310000)
    expect(projection.checkpoints.at(-1)).toMatchObject({ date: '2027-01-01', balance: 175000 })
  })

  it('próximo ingreso después de una fecha', () => {
    const next = nextIncomeAfter(simulate(example(), WINDOW), '2026-11-03')
    expect(next).toMatchObject({ date: '2026-11-07', cents: 260000 })
  })
})

describe('horizonEnd', () => {
  it('accesos rápidos y personalizado con tope', () => {
    expect(horizonEnd('2026-11-02', '7d')).toBe('2026-11-09')
    expect(horizonEnd('2026-11-02', '15d')).toBe('2026-11-17')
    expect(horizonEnd('2026-11-02', '1m')).toBe('2026-12-02')
    expect(horizonEnd('2026-11-02', '3m')).toBe('2027-02-02')
    expect(horizonEnd('2026-11-02', 'custom', '2026-11-20')).toBe('2026-11-20')
    expect(horizonEnd('2026-11-02', 'custom', '2026-10-01')).toBe('2026-12-02')
    expect(horizonEnd('2026-11-02', 'custom', '2030-01-01')).toBe('2028-11-01')
  })
})

describe('compareScenarios', () => {
  it('B − A en saldo final, mínimo y cada corte', () => {
    const a = example()
    const b = scenarioReducer(a, { type: 'add_event', event: createEvent({ type: 'expense', description: 'Celular', amount: '900', date: '2026-11-12' }, NOW) })
    const cmp = compareScenarios(a, b, WINDOW)
    expect(cmp.diff.final).toBe(-90000)
    expect(cmp.diff.outflow).toBe(90000)
    expect(cmp.rows.map((r) => r.diff)).toEqual([0, 0, -90000, -90000, -90000])
    expect(cmp.series).toHaveLength(31)
  })
})

describe('buildInsights', () => {
  it('avisa si te quedas sin dinero antes del próximo ingreso', () => {
    const scenario = scenarioWith([
      { type: 'expense', description: 'Celular', amount: '900', date: '2026-11-04' },
      { type: 'income',  description: 'Sueldo',  amount: '2600', date: '2026-11-30' },
    ])
    const insights = buildInsights(scenario, WINDOW)
    const negative = insights.find((i) => i.id === 'negative')
    expect(negative.title).toMatch(/antes de tu próximo ingreso/)
    expect(negative.detail).toMatch(/26 días antes/)
    // Postergar 15 días no evita el negativo (el sueldo llega el 30), pero
    // sí lo acorta: el mínimo no mejora porque sigue siendo −400.
    expect(insights.find((i) => i.id === 'postpone')).toBeUndefined()
  })

  it('sugiere postergar solo si el saldo mínimo mejora dentro del periodo', () => {
    const scenario = scenarioWith([
      { type: 'expense', description: 'Celular', amount: '900', date: '2026-11-04' },
      { type: 'income',  description: 'Sueldo',  amount: '2600', date: '2026-11-07' },
    ])
    const postpone = buildInsights(scenario, WINDOW).find((i) => i.id === 'postpone')
    expect(postpone.title).toMatch(/«Celular» 15 días/)
    expect(postpone.detail).toMatch(/ya no quedarías en negativo/)
  })

  it('peso de la compra frente a los ingresos y margen de seguridad', () => {
    const insights = buildInsights(example(), WINDOW, { thresholdCents: 20000 })
    const purchase = insights.find((i) => i.id === 'purchase')
    expect(purchase.title).toMatch(/«Compra»/)
    expect(purchase.detail).toMatch(/34,6 %|34.6 %/)
    expect(insights.find((i) => i.id === 'margin').title).toMatch(/300\.00/)
  })

  it('sin eventos no hay recomendaciones', () => {
    expect(buildInsights(scenarioWith([]), WINDOW)).toEqual([])
  })

  it('biggestPurchase toma el gasto único más grande', () => {
    expect(biggestPurchase(simulate(example(), WINDOW))).toMatchObject({ description: 'Compra', cents: 90000 })
  })
})

describe('scenarioReducer', () => {
  it('agregar, duplicar, desactivar, quitar y deshacer', () => {
    let s = example()
    const first = s.events[0]
    s = scenarioReducer(s, { type: 'duplicate_event', id: first.id })
    expect(s.events).toHaveLength(5)
    expect(s.events[1]).toMatchObject({ description: 'Sueldo', amount: '2600' })
    expect(s.events[1].id).not.toBe(first.id)

    s = scenarioReducer(s, { type: 'toggle_event', id: first.id })
    expect(s.events[0].enabled).toBe(false)

    s = scenarioReducer(s, { type: 'remove_event', id: first.id })
    expect(s.events.some((e) => e.id === first.id)).toBe(false)
    s = scenarioReducer(s, { type: 'restore_event', event: first, index: 0 })
    expect(s.events[0].id).toBe(first.id)
  })

  it('importar dos veces el mismo dato real no lo duplica', () => {
    const imported = createEvent({ type: 'expense', amount: '80', date: '2026-11-15', source: { kind: 'recurring_payment', id: 'x' } }, NOW)
    let s = scenarioReducer(example(), { type: 'import_events', events: [imported] })
    s = scenarioReducer(s, { type: 'import_events', events: [{ ...imported, id: 'otro' }] })
    expect(s.events.filter((e) => e.source?.id === 'x')).toHaveLength(1)
  })

  it('normalizeScenario repara datos guardados', () => {
    const s = normalizeScenario({
      name: '  ',
      config: { horizon: 'raro', startDate: 'ayer' },
      events: [{ type: 'income', amount: '10', date: '2026-11-05', repeat: 'cada rato' }, { type: 'x' }],
    }, NOW)
    expect(s.name).toBe('Mi escenario')
    expect(s.config).toMatchObject({ horizon: '1m', startDate: '2026-11-02' })
    expect(s.events).toHaveLength(1)
    expect(s.events[0].repeat).toBe('once')
  })
})

describe('horizonte "Fin de mes"', () => {
  it('termina el último día del mes de inicio', () => {
    expect(horizonEnd('2026-11-06', 'eom')).toBe('2026-11-30')
    expect(horizonEnd('2027-02-10', 'eom')).toBe('2027-02-28')
    expect(horizonEnd('2028-02-10', 'eom')).toBe('2028-02-29')
    expect(horizonEnd('2026-11-30', 'eom')).toBe('2026-11-30')
  })

  it('es el horizonte de un escenario nuevo y sobrevive a la normalización', () => {
    expect(createScenario({}, NOW).config.horizon).toBe('eom')
    expect(normalizeScenario({ config: { horizon: 'eom' } }, NOW).config.horizon).toBe('eom')
  })

  it('proyecta el saldo final de esa fecha, también iniciando el último día', () => {
    const scenario = createScenario({
      config: { ...createScenario({}, NOW).config, initialBalance: '1000', startDate: '2026-11-30' },
      events: [createEvent({ type: 'expense', amount: '300', date: '2026-11-30' }, NOW)],
    }, NOW)
    const { window, summary } = runProjection(scenario)
    expect(window.to).toBe('2026-11-30')
    expect(summary.final).toBe(70000)
  })
})

describe('parseQuickEntries', () => {
  const entry = (description, amount, type = 'expense') => ({ description, amount, type })

  it('lee concepto y monto en una línea', () => {
    expect(parseQuickEntries('Alquiler 800').entries).toEqual([entry('Alquiler', '800')])
    expect(parseQuickEntries('Luz: S/ 120.50').entries).toEqual([entry('Luz', '120.50')])
    expect(parseQuickEntries('Pago 2 cuotas 300').entries).toEqual([entry('Pago 2 cuotas', '300')])
  })

  it('un + delante del monto es ingreso; un - sigue siendo gasto', () => {
    expect(parseQuickEntries('Sueldo +3000').entries).toEqual([entry('Sueldo', '3000', 'income')])
    expect(parseQuickEntries('Luz -50').entries).toEqual([entry('Luz', '50')])
    expect(parseQuickEntries('Luz - 50').entries).toEqual([entry('Luz', '50')])
  })

  it('lee columnas pegadas de Excel e ignora el encabezado', () => {
    const { entries, skipped } = parseQuickEntries('Concepto\tPrecio\r\nAlquiler\t800\r\nInternet\t99.90\r\n')
    expect(entries).toEqual([entry('Alquiler', '800'), entry('Internet', '99.90')])
    expect(skipped).toEqual(['Concepto\tPrecio'])
  })

  it('lee el precio en la línea debajo del concepto', () => {
    expect(parseQuickEntries('Alquiler\n800\nLuz\n120').entries).toEqual([entry('Alquiler', '800'), entry('Luz', '120')])
  })

  it('entiende miles y decimales con coma', () => {
    const amounts = (t) => parseQuickEntries(t).entries[0].amount
    expect(amounts('Moto 1,200')).toBe('1200')
    expect(amounts('Moto 1,200.50')).toBe('1200.50')
    expect(amounts('Moto 800,50')).toBe('800.50')
  })

  it('un monto solo no necesita concepto', () => {
    expect(parseQuickEntries('800').entries).toEqual([entry('', '800')])
  })

  it('informa lo que no pudo leer y no inventa movimientos', () => {
    expect(parseQuickEntries('Solo texto')).toEqual({ entries: [], skipped: ['Solo texto'] })
    expect(parseQuickEntries('Gratis 0')).toEqual({ entries: [], skipped: ['Gratis 0'] })
    expect(parseQuickEntries('')).toEqual({ entries: [], skipped: [] })
    expect(parseQuickEntries('Sin precio\nAlquiler 800').skipped).toEqual(['Sin precio'])
  })
})

describe('readAmountInput', () => {
  it('separa el signo del monto', () => {
    expect(readAmountInput('+3000')).toEqual({ sign: '+', amount: '3000' })
    expect(readAmountInput('- 50')).toEqual({ sign: '-', amount: '50' })
    expect(readAmountInput(' 120.50 ')).toEqual({ sign: null, amount: '120.50' })
  })

  it('acepta la coma decimal del teclado del móvil y los miles', () => {
    expect(readAmountInput('800,50').amount).toBe('800.50')
    expect(readAmountInput('1,200').amount).toBe('1200')
    expect(readAmountInput('1,200.50').amount).toBe('1200.50')
  })

  it('tolera vacío', () => {
    expect(readAmountInput('')).toEqual({ sign: null, amount: '' })
    expect(readAmountInput(null)).toEqual({ sign: null, amount: '' })
  })
})
