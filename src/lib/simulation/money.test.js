import { describe, it, expect } from 'vitest'
import { toCents, fromCents, isPositiveAmount, percentOf } from './money'

describe('toCents', () => {
  it('convierte textos y números a céntimos enteros', () => {
    expect(toCents('2600')).toBe(260000)
    expect(toCents('12.5')).toBe(1250)
    expect(toCents('1,234.56')).toBe(123456)
    expect(toCents(0.29)).toBe(29)
    expect(toCents(-15.75)).toBe(-1575)
  })
  it('redondea el tercer decimal hacia arriba desde 5', () => {
    expect(toCents('10.005')).toBe(1001)
    expect(toCents('10.004')).toBe(1000)
    expect(toCents(12.345)).toBe(1235)
  })
  it('vacío o inválido es 0', () => {
    expect(toCents('')).toBe(0)
    expect(toCents(null)).toBe(0)
    expect(toCents('abc')).toBe(0)
    expect(toCents('.')).toBe(0)
    expect(toCents(Number.NaN)).toBe(0)
  })
  it('sumar en céntimos no acumula error de coma flotante', () => {
    const cents = Array.from({ length: 10 }, () => toCents('0.1')).reduce((a, b) => a + b, 0)
    expect(fromCents(cents)).toBe(1)
    expect(fromCents(toCents('0.1') + toCents('0.2'))).toBe(0.3)
  })
})

describe('isPositiveAmount', () => {
  it('acepta montos > 0 y rechaza el resto', () => {
    expect(isPositiveAmount('900')).toBe(true)
    expect(isPositiveAmount('0.01')).toBe(true)
    expect(isPositiveAmount('0')).toBe(false)
    expect(isPositiveAmount('-5')).toBe(false)
    expect(isPositiveAmount('')).toBe(false)
    expect(isPositiveAmount('12a')).toBe(false)
  })
})

describe('percentOf', () => {
  it('porcentaje con un decimal; null sin base', () => {
    expect(percentOf(90000, 260000)).toBe(34.6)
    expect(percentOf(1, 0)).toBeNull()
    expect(percentOf(5, -10)).toBeNull()
  })
})
