import { describe, it, expect } from 'vitest'
import { formatCurrency, formatSignedCurrency, formatCurrencyCompact, formatRelativeDay } from './formatters'

// Intl separa "S/" de la cifra con un espacio no separable; los negativos
// llevan el signo menos tipográfico.
const S = 'S/' + String.fromCharCode(0xa0)
const MINUS = String.fromCharCode(0x2212)

describe('formatCurrency', () => {
  it('formatea en soles con separador de miles y 2 decimales', () => {
    expect(formatCurrency(1234.5)).toBe(`${S}1,234.50`)
  })

  it('usa el signo menos tipográfico en negativos', () => {
    expect(formatCurrency(-1234.5)).toBe(`${MINUS}${S}1,234.50`)
  })

  it('trata null/undefined como cero', () => {
    expect(formatCurrency(null)).toBe(`${S}0.00`)
  })
})

describe('formatSignedCurrency', () => {
  it('antepone + a los positivos y − a los negativos', () => {
    expect(formatSignedCurrency(50)).toBe(`+${S}50.00`)
    expect(formatSignedCurrency(-50)).toBe(`${MINUS}${S}50.00`)
  })

  it('permite forzar el signo de una salida guardada en positivo', () => {
    expect(formatSignedCurrency(50, { sign: -1 })).toBe(`${MINUS}${S}50.00`)
  })

  it('no pone signo al cero', () => {
    expect(formatSignedCurrency(0)).toBe(`${S}0.00`)
  })
})

describe('formatCurrencyCompact', () => {
  it('abrevia miles para los ejes', () => {
    expect(formatCurrencyCompact(850)).toBe(`${S}850`)
    expect(formatCurrencyCompact(1200)).toBe(`${S}1.2k`)
    expect(formatCurrencyCompact(15000)).toBe(`${S}15k`)
    expect(formatCurrencyCompact(2000)).toBe(`${S}2k`)
    expect(formatCurrencyCompact(-2000)).toBe(`${MINUS}${S}2k`)
  })
})

describe('formatRelativeDay', () => {
  const now = new Date(2026, 9, 31, 10, 0)
  it('usa Hoy y Ayer para los dos últimos días', () => {
    expect(formatRelativeDay('2026-10-31', now)).toBe('Hoy')
    expect(formatRelativeDay('2026-10-30', now)).toBe('Ayer')
  })
  it('omite el año actual y lo muestra en años anteriores', () => {
    expect(formatRelativeDay('2026-10-12', now)).toBe('12 oct')
    expect(formatRelativeDay('2025-12-24', now)).toBe('24 dic 2025')
  })
  it('devuelve vacío sin fecha', () => {
    expect(formatRelativeDay(null, now)).toBe('')
  })
})
