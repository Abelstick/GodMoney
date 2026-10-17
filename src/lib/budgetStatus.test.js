import { describe, it, expect } from 'vitest'
import {
  BUDGET_STATUS, getBudgetStatus, budgetStatusSeverity, sumBudgetSpent, allBudgetCategoryIds,
  getBudgetBadgeLabel, getBudgetAlertMessage,
} from './budgetStatus'

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
  const spent = { cat1: 40, cat2: 25.5, otra: 1000 }

  it('sumBudgetSpent suma solo las categorías del presupuesto', () => {
    expect(sumBudgetSpent({ category_ids: ['cat1', 'cat2'] }, spent)).toBe(65.5)
  })

  it('ignora categorías sin gasto y presupuestos sin categorías', () => {
    expect(sumBudgetSpent({ category_ids: ['cat1', 'nada'] }, spent)).toBe(40)
    expect(sumBudgetSpent({ category_ids: [] }, spent)).toBe(0)
    expect(sumBudgetSpent({}, spent)).toBe(0)
  })

  it('allBudgetCategoryIds junta los ids sin repetir', () => {
    const budgets = [{ category_ids: ['a', 'b'] }, { category_ids: ['b', 'c'] }, {}]
    expect(allBudgetCategoryIds(budgets).sort()).toEqual(['a', 'b', 'c'])
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
