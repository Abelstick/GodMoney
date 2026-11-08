import { describe, it, expect } from 'vitest'
import { SPLIT_MODES, evenPercents, resolveSplit, fillRemaining, convertParts, buildSplitExpenses, splitFromGroup, groupTotal, diffSplitGroup } from './expenseSplit'

const { PERCENT, AMOUNT } = SPLIT_MODES
const parts = (...values) => values.map((value, i) => ({ category_id: `c${i}`, value }))

describe('evenPercents', () => {
  it('reparte 100 % en partes iguales que suman exacto', () => {
    expect(evenPercents(2)).toEqual(['50', '50'])
    expect(evenPercents(3)).toEqual(['33.34', '33.33', '33.33'])
  })
})

describe('resolveSplit', () => {
  it('por porcentaje reparte los céntimos sin perder ninguno', () => {
    const r = resolveSplit('10', parts('33.34', '33.33', '33.33'), PERCENT)
    expect(r.valid).toBe(true)
    expect(r.amounts.reduce((a, b) => a + b, 0)).toBe(1000)
  })

  it('mitad y mitad de un monto impar suma el total', () => {
    const r = resolveSplit('45.55', parts('50', '50'), PERCENT)
    expect(r.amounts).toEqual([2278, 2277])
  })

  it('por monto exige que las partes sumen el total', () => {
    expect(resolveSplit('60', parts('40', '20'), AMOUNT).valid).toBe(true)
    const short = resolveSplit('60', parts('40', '10'), AMOUNT)
    expect(short.valid).toBe(false)
    expect(short.error).toBe('Falta asignar S/ 10.00')
    expect(resolveSplit('60', parts('40', '30'), AMOUNT).error).toBe('Te pasaste por S/ 10.00')
  })

  it('avisa si falta porcentaje o hay categorías repetidas', () => {
    expect(resolveSplit('60', parts('70', '20'), PERCENT).error).toBe('Falta asignar 10 %')
    const dup = [{ category_id: 'a', value: '50' }, { category_id: 'a', value: '50' }]
    expect(resolveSplit('60', dup, PERCENT).error).toBe('Hay una categoría repetida')
  })

  it('no acepta partes en cero', () => {
    expect(resolveSplit('60', parts('100', '0'), PERCENT).valid).toBe(false)
  })
})

describe('fillRemaining', () => {
  it('completa una parte con lo que falta', () => {
    expect(fillRemaining('60', parts('40', ''), AMOUNT, 1)).toBe('20.00')
    expect(fillRemaining('60', parts('70', ''), PERCENT, 1)).toBe('30')
  })
})

describe('convertParts', () => {
  it('pasa de porcentaje a monto y de vuelta', () => {
    const amounts = convertParts('60', parts('75', '25'), PERCENT, AMOUNT)
    expect(amounts.map((p) => p.value)).toEqual(['45.00', '15.00'])
    expect(convertParts('60', amounts, AMOUNT, PERCENT).map((p) => p.value)).toEqual(['75', '25'])
  })
})

describe('buildSplitExpenses', () => {
  it('crea un gasto por parte con el mismo grupo', () => {
    let n = 0
    const rows = buildSplitExpenses(
      { amount: 60, description: 'Pollo a la brasa', date: '2026-11-08', savings_account_id: 'acc' },
      parts('50', '50'),
      PERCENT,
      { groupId: 'g1', newId: () => `id${n++}`, isSavingsCategory: (id) => id === 'c1' },
    )
    expect(rows).toEqual([
      { amount: 30, description: 'Pollo a la brasa', date: '2026-11-08', savings_account_id: null, id: 'id0', category_id: 'c0', split_group_id: 'g1' },
      { amount: 30, description: 'Pollo a la brasa', date: '2026-11-08', savings_account_id: 'acc', id: 'id1', category_id: 'c1', split_group_id: 'g1' },
    ])
  })

  it('no construye una división inválida', () => {
    expect(() => buildSplitExpenses({ amount: 60 }, parts('40', '10'), AMOUNT, { groupId: 'g', newId: () => 'x' }))
      .toThrow('Falta asignar')
  })
})

describe('editar un gasto dividido', () => {
  const group = [
    { id: 'b', split_group_id: 'g', category_id: 'pareja', amount: '30.00', created_at: '2026-11-08T10:00:00Z' },
    { id: 'a', split_group_id: 'g', category_id: null, amount: 30.5, created_at: '2026-11-08T10:00:00Z' },
  ]

  it('arma las partes en monto conservando ids y grupo', () => {
    const split = splitFromGroup(group)
    expect(split.mode).toBe(AMOUNT)
    expect(split.groupId).toBe('g')
    expect(split.parts.map(({ id, category_id, value }) => ({ id, category_id, value }))).toEqual([
      { id: 'a', category_id: '', value: '30.50' },
      { id: 'b', category_id: 'pareja', value: '30.00' },
    ])
    expect(groupTotal(group)).toBe(60.5)
  })

  it('al duplicar no conserva ids ni grupo', () => {
    const split = splitFromGroup(group, { keepIds: false })
    expect(split.groupId).toBeNull()
    expect(split.parts.every((p) => p.id === undefined)).toBe(true)
  })

  it('calcula qué actualizar, insertar y borrar', () => {
    const diff = diffSplitGroup(group, [{ id: 'a', amount: 40 }, { id: 'n', amount: 20 }])
    expect(diff.toUpdate.map((r) => r.id)).toEqual(['a'])
    expect(diff.toInsert.map((r) => r.id)).toEqual(['n'])
    expect(diff.toDelete).toEqual(['b'])
  })
})
