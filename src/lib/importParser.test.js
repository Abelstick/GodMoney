import { describe, it, expect } from 'vitest'
import { guessMapping, parseDate, parseAmount, normalizeText, rowsToMovements, movementKey } from './importParser'

describe('parseDate', () => {
  it.each([
    ['15/03/2026', '2026-03-15'],
    ['15-03-2026', '2026-03-15'],
    ['2026-03-15', '2026-03-15'],
    ['2026/3/5', '2026-03-05'],
    ['5.3.2026', '2026-03-05'],
    ['15/03/26', '2026-03-15'],
    ['2026-03-15 10:20:00', '2026-03-15'],
    ['2026-03-15T10:20:00', '2026-03-15'],
  ])('interpreta %s', (raw, expected) => {
    expect(parseDate(raw)).toBe(expected)
  })

  it.each(['', null, undefined, 'hoy', '31/02/2026', '2026-13-01', '00/00/0000'])('rechaza %s', (raw) => {
    expect(parseDate(raw)).toBeNull()
  })

  it('acepta el 29 de febrero solo en año bisiesto', () => {
    expect(parseDate('29/02/2024')).toBe('2024-02-29')
    expect(parseDate('29/02/2026')).toBeNull()
  })
})

describe('parseAmount', () => {
  it.each([
    ['12.50', 12.5],
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['S/ 12.50', 12.5],
    ['12,50', 12.5],
    ['1,234', 1234],
    ['-12.50', -12.5],
    ['12.50-', -12.5],
    ['S/ -12.50', -12.5],
    ['(12.50)', -12.5],
    ['  7  ', 7],
    [15, 15],
  ])('interpreta %s', (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected)
  })

  it.each(['', '   ', null, undefined, 'abc', 'S/'])('devuelve null para %s', (raw) => {
    expect(parseAmount(raw)).toBeNull()
  })
})

describe('guessMapping', () => {
  it('detecta columnas con monto con signo', () => {
    const { mapping, mode } = guessMapping(['Fecha', 'Descripción', 'Monto'])
    expect(mapping).toMatchObject({ date: 0, description: 1, amount: 2 })
    expect(mode).toBe('signed')
  })

  it('detecta columnas de cargo y abono', () => {
    const { mapping, mode } = guessMapping(['F. Operación', 'Detalle', 'Cargo', 'Abono'])
    expect(mapping).toMatchObject({ date: 0, description: 1, debit: 2, credit: 3, amount: -1 })
    expect(mode).toBe('split')
  })

  it('devuelve -1 para lo que no encuentra', () => {
    const { mapping } = guessMapping(['a', 'b'])
    expect(Object.values(mapping)).toEqual([-1, -1, -1, -1, -1])
  })
})

describe('rowsToMovements', () => {
  const mapping = { date: 0, description: 1, amount: 2, debit: 2, credit: 3 }

  it('con signo: negativo es gasto y positivo es ingreso', () => {
    const [a, b] = rowsToMovements([['15/03/2026', 'Super', '-45.20'], ['16/03/2026', 'Sueldo', '3000']], mapping, 'signed')
    expect(a).toMatchObject({ date: '2026-03-15', description: 'Super', amount: 45.2, kind: 'expense', error: null })
    expect(b).toMatchObject({ date: '2026-03-16', amount: 3000, kind: 'income', error: null })
  })

  it('con cargo/abono usa la columna que tenga valor', () => {
    const rows = [['01/03/2026', 'Luz', '80,00', ''], ['02/03/2026', 'Depósito', '', '500,00']]
    const [debit, credit] = rowsToMovements(rows, mapping, 'split')
    expect(debit).toMatchObject({ kind: 'expense', amount: 80 })
    expect(credit).toMatchObject({ kind: 'income', amount: 500 })
  })

  it('los modos expense e income fuerzan el tipo ignorando el signo', () => {
    expect(rowsToMovements([['01/03/2026', 'X', '-10']], mapping, 'income')[0]).toMatchObject({ kind: 'income', amount: 10 })
    expect(rowsToMovements([['01/03/2026', 'X', '10']], mapping, 'expense')[0]).toMatchObject({ kind: 'expense', amount: 10 })
  })

  it('marca error en fechas inválidas y montos vacíos o en cero', () => {
    const [badDate, zero, empty] = rowsToMovements(
      [['31/02/2026', 'X', '10'], ['01/03/2026', 'X', '0'], ['01/03/2026', 'X', '']],
      mapping,
      'signed',
    )
    expect(badDate.error).toBe('Fecha inválida')
    expect(zero.error).toBe('Monto inválido o en cero')
    expect(empty.error).toBe('Monto inválido o en cero')
  })

  it('conserva el índice de cada fila y recorta la descripción', () => {
    const out = rowsToMovements([['01/03/2026', '  Café  ', '-5'], ['02/03/2026', 'Té', '-3']], mapping, 'signed')
    expect(out.map((m) => m.index)).toEqual([0, 1])
    expect(out[0].description).toBe('Café')
  })
})

describe('normalizeText y movementKey', () => {
  it('quita tildes, mayúsculas y espacios repetidos', () => {
    expect(normalizeText('  CAFÉ   Ñandú ')).toBe('cafe nandu')
  })

  it('genera la misma clave para el mismo movimiento aunque cambie el formato del texto', () => {
    expect(movementKey('expense', '2026-03-15', 45.2, 'Súper  Mercado')).toBe(movementKey('expense', '2026-03-15', '45.20', 'super mercado'))
  })

  it('distingue tipo, fecha y monto', () => {
    const base = movementKey('expense', '2026-03-15', 10, 'x')
    expect(movementKey('income',  '2026-03-15', 10, 'x')).not.toBe(base)
    expect(movementKey('expense', '2026-03-16', 10, 'x')).not.toBe(base)
    expect(movementKey('expense', '2026-03-15', 11, 'x')).not.toBe(base)
  })
})
