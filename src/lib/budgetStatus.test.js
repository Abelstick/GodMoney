import { describe, it, expect } from 'vitest'
import {
  BUDGET_STATUS, getBudgetStatus, budgetStatusSeverity, allBudgetCategoryIds,
  getBudgetBadgeLabel, getBudgetAlertMessage,
  getBudgetPeriodRange, getBudgetReferenceDate, getBudgetsRange, getBudgetPeriodText,
  spentInRange, withBudgetStatus, summarizeBudgets,
  getBudgetPace, sortBudgetsByUrgency, getBudgetMovementsUrl,
} from './budgetStatus'

describe('getBudgetPace', () => {
  const day = (d) => new Date(2026, 10, d) // noviembre de 2026, 30 días
  const row = (amount, date, extra = {}) => ({ category_id: 'a', amount, date, ...extra })
  const pace = (rows, now, base = {}) => withBudgetStatus(
    { amount: 1000, period: 'monthly', category_ids: ['a'], ...base }, rows, now, now,
  ).pace

  it('no extrapola un pago fijo: el alquiler no se repite a diario', () => {
    const p = pace([row(800, '2026-11-02', { is_fixed: true })], day(10))
    expect(p.projected).toBe(800)
    expect(p.projectedOver).toBe(false)
  })

  it('tampoco extrapola el ahorro', () => {
    const p = pace([row(500, '2026-11-02', { category: { is_savings: true } })], day(10))
    expect(p.projected).toBe(500)
  })

  it('suma lo fijo y extrapola solo lo variable', () => {
    const p = pace([row(500, '2026-11-02', { is_fixed: true }), row(100, '2026-11-05')], day(10))
    expect(p.projected).toBe(800) // 600 + 10 al día × 20 días
  })

  it('avisa si el ritmo variable supera el límite', () => {
    const p = pace([row(500, '2026-11-05')], day(10))
    expect(p.projected).toBe(1500)
    expect(p.projectedOver).toBe(true)
  })

  it('no proyecta con menos de 3 días ni sin gasto, pero sí da el por día', () => {
    expect(pace([row(100, '2026-11-01')], day(2)).projected).toBeNull()
    expect(pace([], day(10)).projected).toBeNull()
    expect(pace([], day(21)).perDay).toBe(100) // 1000 entre 10 días, hoy incluido
  })

  it('un gasto con fecha futura cuenta como gastado, no para el ritmo', () => {
    const p = pace([row(100, '2026-11-05'), row(200, '2026-11-25')], day(10))
    expect(p.projected).toBe(500) // 300 + 10 al día × 20 días
  })

  it('el por día redondea hacia abajo y desaparece sin saldo o en un anual', () => {
    expect(pace([], day(28)).perDay).toBe(333.33)
    expect(pace([row(1000, '2026-11-05')], day(10)).perDay).toBeNull()
    expect(pace([], day(10), { period: 'yearly' }).perDay).toBeNull()
  })

  it('es null fuera del período', () => {
    const b = withBudgetStatus({ amount: 100, period: 'monthly', category_ids: ['a'] }, [], new Date(2026, 9, 31), day(6))
    expect(b.pace).toBeNull()
    expect(getBudgetPace({ amount: 100, period: 'monthly', spent: 0 }, [], day(6))).toBeNull()
  })
})

describe('sortBudgetsByUrgency', () => {
  it('ordena por gravedad, luego por proyección y por porcentaje', () => {
    const b = (name, status, percent, projectedOver = false) => ({ name, status, percent, pace: { projectedOver } })
    const sorted = sortBudgetsByUrgency([
      b('tranquilo', BUDGET_STATUS.NORMAL, 70),
      b('se pasará', BUDGET_STATUS.NORMAL, 20, true),
      b('cerca', BUDGET_STATUS.WARNING, 85),
      b('excedido', BUDGET_STATUS.EXCEEDED, 120),
      b('algo', BUDGET_STATUS.NORMAL, 10),
    ]).map((x) => x.name)
    expect(sorted).toEqual(['excedido', 'cerca', 'se pasará', 'tranquilo', 'algo'])
  })

  it('no modifica la lista original y tolera pace null', () => {
    const list = [{ name: 'b', status: BUDGET_STATUS.NORMAL, percent: 0, pace: null }, { name: 'a', status: BUDGET_STATUS.NORMAL, percent: 0, pace: null }]
    expect(sortBudgetsByUrgency(list).map((x) => x.name)).toEqual(['a', 'b'])
    expect(list[0].name).toBe('b')
  })
})

describe('getBudgetMovementsUrl', () => {
  it('lleva categorías y período del presupuesto', () => {
    const url = getBudgetMovementsUrl({ category_ids: ['a', 'b'], range: { from: '2026-11-02', to: '2026-11-08' } })
    const params = new URLSearchParams(url.split('?')[1])
    expect(url.startsWith('/movimientos?')).toBe(true)
    expect(Object.fromEntries(params)).toEqual({ tipo: 'expense', desde: '2026-11-02', hasta: '2026-11-08', categorias: 'a,b' })
  })
})

describe('getBudgetStatus', () => {
  it('normal por debajo del 80 %', () => {
    expect(getBudgetStatus(0, 100)).toBe(BUDGET_STATUS.NORMAL)
    expect(getBudgetStatus(79.99, 100)).toBe(BUDGET_STATUS.NORMAL)
  })

  it('advertencia desde el 80 % exacto hasta antes del límite', () => {
    expect(getBudgetStatus(80, 100)).toBe(BUDGET_STATUS.WARNING)
    expect(getBudgetStatus(99.99, 100)).toBe(BUDGET_STATUS.WARNING)
  })

  it('alcanzado en el límite exacto y excedido por encima', () => {
    expect(getBudgetStatus(100, 100)).toBe(BUDGET_STATUS.REACHED)
    expect(getBudgetStatus(100.01, 100)).toBe(BUDGET_STATUS.EXCEEDED)
  })

  it('compara en centavos: 0.1 + 0.2 alcanza justo un límite de 0.3', () => {
    expect(getBudgetStatus(0.1 + 0.2, 0.3)).toBe(BUDGET_STATUS.REACHED)
  })

  it('acepta montos como texto (así llegan de la base)', () => {
    expect(getBudgetStatus('50.00', '50.00')).toBe(BUDGET_STATUS.REACHED)
  })

  it('un límite en cero o negativo nunca alerta', () => {
    expect(getBudgetStatus(500, 0)).toBe(BUDGET_STATUS.NORMAL)
    expect(getBudgetStatus(500, -10)).toBe(BUDGET_STATUS.NORMAL)
  })
})

describe('budgetStatusSeverity', () => {
  it('ordena de menos a más grave', () => {
    const order = [BUDGET_STATUS.NORMAL, BUDGET_STATUS.WARNING, BUDGET_STATUS.REACHED, BUDGET_STATUS.EXCEEDED]
    const sev = order.map(budgetStatusSeverity)
    expect(sev).toEqual([...sev].sort((a, b) => a - b))
    expect(new Set(sev).size).toBe(4)
  })

  it('un estado desconocido vale 0', () => {
    expect(budgetStatusSeverity('xyz')).toBe(0)
  })
})

describe('presupuestos con varias categorías', () => {
  it('allBudgetCategoryIds junta los ids sin repetir', () => {
    const budgets = [{ category_ids: ['a', 'b'] }, { category_ids: ['b', 'c'] }, {}]
    expect(allBudgetCategoryIds(budgets).sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('período de cada presupuesto', () => {
  // Viernes 6 nov 2026, hora local.
  const friday = new Date(2026, 10, 6)

  it('la semana va de lunes a domingo, también si cruza de mes', () => {
    expect(getBudgetPeriodRange('weekly', friday)).toEqual({ from: '2026-11-02', to: '2026-11-08' })
    expect(getBudgetPeriodRange('weekly', new Date(2026, 9, 31))).toEqual({ from: '2026-10-26', to: '2026-11-01' })
  })

  it('el domingo pertenece a la semana que termina ese día', () => {
    expect(getBudgetPeriodRange('weekly', new Date(2026, 10, 8))).toEqual({ from: '2026-11-02', to: '2026-11-08' })
  })

  it('mensual y anual cubren el mes y el año completos', () => {
    expect(getBudgetPeriodRange('monthly', friday)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(getBudgetPeriodRange('yearly', friday)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  it('en el mes en curso manda hoy; en uno pasado, su último día', () => {
    expect(getBudgetReferenceDate('2026-11', friday)).toBe(friday)
    const past = getBudgetReferenceDate('2026-10', friday)
    expect(getBudgetPeriodRange('weekly', past)).toEqual({ from: '2026-10-26', to: '2026-11-01' })
  })

  it('getBudgetsRange cubre todos los períodos y es null sin presupuestos', () => {
    const budgets = [{ period: 'weekly' }, { period: 'monthly' }]
    expect(getBudgetsRange(budgets, new Date(2026, 9, 31))).toEqual({ from: '2026-10-01', to: '2026-11-01' })
    expect(getBudgetsRange([], friday)).toBeNull()
  })

  it('texto del período', () => {
    const text = (period) => getBudgetPeriodText({ period, range: getBudgetPeriodRange(period, friday) })
    expect(text('monthly')).toBe('Mensual')
    expect(text('weekly')).toMatch(/^Semanal · 2 nov.* – 8 nov/)
    expect(text('yearly')).toBe('Anual · 2026')
  })
})

describe('gasto por período', () => {
  const friday = new Date(2026, 10, 6)
  const rows = [
    { category_id: 'a', amount: '40.10', date: '2026-11-02' }, // lunes de esta semana
    { category_id: 'a', amount: '60.20', date: '2026-11-01' }, // domingo anterior
    { category_id: 'a', amount: '300',   date: '2026-03-15' }, // este año, otro mes
    { category_id: 'b', amount: '25.50', date: '2026-11-03' },
    { category_id: 'z', amount: '999',   date: '2026-11-03' }, // fuera de presupuesto
  ]

  it('spentInRange respeta categorías y extremos del rango', () => {
    expect(spentInRange(rows, ['a'], { from: '2026-11-02', to: '2026-11-08' })).toBe(40.1)
    expect(spentInRange(rows, ['a'], { from: '2026-11-01', to: '2026-11-01' })).toBe(60.2)
    expect(spentInRange(rows, [], { from: '2026-01-01', to: '2026-12-31' })).toBe(0)
  })

  it('suma en centavos, sin error de redondeo', () => {
    const r = [{ category_id: 'a', amount: 0.1, date: '2026-11-02' }, { category_id: 'a', amount: 0.2, date: '2026-11-02' }]
    expect(spentInRange(r, ['a'], { from: '2026-11-01', to: '2026-11-30' })).toBe(0.3)
  })

  it('el mismo gasto cuenta según el período de cada presupuesto', () => {
    const base = { amount: 100, category_ids: ['a'] }
    expect(withBudgetStatus({ ...base, period: 'weekly' }, rows, friday).spent).toBe(40.1)
    expect(withBudgetStatus({ ...base, period: 'monthly' }, rows, friday).spent).toBe(100.3)
    expect(withBudgetStatus({ ...base, period: 'yearly' }, rows, friday).spent).toBe(400.3)
  })

  it('un semanal no sale excedido por el gasto del resto del mes', () => {
    const b = withBudgetStatus({ amount: 50, period: 'weekly', category_ids: ['a'] }, rows, friday)
    expect(b.status).toBe(BUDGET_STATUS.WARNING)
    expect(b.percent).toBe(80)
  })

  it('un anual sí acumula los meses anteriores', () => {
    const b = withBudgetStatus({ amount: 400, period: 'yearly', category_ids: ['a'] }, rows, friday)
    expect(b.status).toBe(BUDGET_STATUS.EXCEEDED)
    expect(b.overBy).toBeCloseTo(0.3)
    expect(b.remaining).toBe(0)
  })
})

describe('summarizeBudgets', () => {
  const friday = new Date(2026, 10, 6)
  const row = (category_id, amount) => ({ category_id, amount, date: '2026-11-03' })
  const build = (list, rows) => summarizeBudgets(list.map((b) => withBudgetStatus(b, rows, friday)), rows)

  it('lo restante es el neto: un exceso descuenta lo que sobra en otro', () => {
    const s = build(
      [{ amount: 100, period: 'monthly', category_ids: ['a'] }, { amount: 100, period: 'monthly', category_ids: ['b'] }],
      [row('a', 150), row('b', 50)],
    )
    expect(s).toMatchObject({ limit: 200, spent: 200, net: 0, percent: 100, exceededCount: 1 })
  })

  it('el neto es negativo si en total te pasaste, y el % no se recorta', () => {
    const s = build([{ amount: 100, period: 'monthly', category_ids: ['a'] }], [row('a', 130)])
    expect(s.net).toBe(-30)
    expect(s.percent).toBe(130)
  })

  it('una categoría en dos presupuestos se cuenta una vez y se avisa', () => {
    const s = build(
      [{ amount: 100, period: 'monthly', category_ids: ['a'] }, { amount: 200, period: 'monthly', category_ids: ['a', 'b'] }],
      [row('a', 80), row('b', 20)],
    )
    expect(s.spent).toBe(100)
    expect(s.hasSharedCategories).toBe(true)
  })

  it('no mezcla límites semanales ni anuales', () => {
    const s = build(
      [
        { amount: 100, period: 'monthly', category_ids: ['a'] },
        { amount: 50, period: 'weekly', category_ids: ['b'] },
        { amount: 5000, period: 'yearly', category_ids: ['c'] },
      ],
      [row('a', 10), row('b', 500), row('c', 1)],
    )
    expect(s).toMatchObject({ limit: 100, spent: 10, monthlyCount: 1, otherPeriodCount: 2, exceededCount: 0, hasSharedCategories: false })
  })

  it('es null si no hay presupuestos mensuales', () => {
    expect(build([{ amount: 50, period: 'weekly', category_ids: ['b'] }], [])).toBeNull()
  })
})

describe('textos de alerta', () => {
  it('etiqueta de la insignia', () => {
    expect(getBudgetBadgeLabel({ status: BUDGET_STATUS.EXCEEDED, percent: 120 })).toBe('Excedido')
    expect(getBudgetBadgeLabel({ status: BUDGET_STATUS.REACHED, percent: 100 })).toBe('Alcanzado')
    expect(getBudgetBadgeLabel({ status: BUDGET_STATUS.WARNING, percent: 85 })).toBe('85%')
  })

  it('el mensaje incluye siempre el límite', () => {
    const base = { amount: 100, remaining: 0, overBy: 0, percent: 100 }
    expect(getBudgetAlertMessage({ ...base, status: BUDGET_STATUS.EXCEEDED, overBy: 20 })).toMatch(/Excediste.*100.*20/)
    expect(getBudgetAlertMessage({ ...base, status: BUDGET_STATUS.REACHED })).toMatch(/Alcanzaste.*100/)
    expect(getBudgetAlertMessage({ ...base, status: BUDGET_STATUS.WARNING, percent: 85, remaining: 15 })).toMatch(/85%.*100.*15/)
  })
})
