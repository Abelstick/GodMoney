import { describe, it, expect } from 'vitest'
import { buildRange, isValidRange, previousRange, percentDelta, rangeLabel } from './dateRanges'

const today = new Date(2026, 9, 16) // 16 oct 2026

describe('buildRange', () => {
  it('últimos 30 días incluye hoy', () => {
    expect(buildRange('30d', today)).toEqual({ type: '30d', from: '2026-09-17', to: '2026-10-16' })
  })

  it('este año va del 1 de enero a hoy', () => {
    expect(buildRange('year', today)).toEqual({ type: 'year', from: '2026-01-01', to: '2026-10-16' })
  })

  it('personalizado arranca en el mes en curso', () => {
    expect(buildRange('custom', today)).toEqual({ type: 'custom', from: '2026-10-01', to: '2026-10-16' })
  })
})

describe('isValidRange', () => {
  it('acepta rangos ordenados y de un solo día', () => {
    expect(isValidRange('2026-10-01', '2026-10-16')).toBe(true)
    expect(isValidRange('2026-10-16', '2026-10-16')).toBe(true)
  })

  it('rechaza rangos invertidos, vacíos o con fechas inválidas', () => {
    expect(isValidRange('2026-10-16', '2026-10-01')).toBe(false)
    expect(isValidRange('', '2026-10-01')).toBe(false)
    expect(isValidRange('2026-10-01', undefined)).toBe(false)
    expect(isValidRange('no-es-fecha', '2026-10-01')).toBe(false)
  })
})

describe('previousRange', () => {
  it('un mes completo se compara con el mes anterior', () => {
    expect(previousRange({ from: '2026-10-01', to: '2026-10-31' })).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('cruza el cambio de año', () => {
    expect(previousRange({ from: '2026-01-01', to: '2026-01-31' })).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })

  it('respeta la longitud de febrero', () => {
    expect(previousRange({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-02-01', to: '2026-02-28' })
  })

  it('lo que empieza el 1 de enero se compara con el mismo tramo del año anterior', () => {
    expect(previousRange({ from: '2026-01-01', to: '2026-10-16' })).toEqual({ from: '2025-01-01', to: '2025-10-16' })
  })

  it('otros rangos se comparan con los mismos días justo antes', () => {
    expect(previousRange({ from: '2026-09-17', to: '2026-10-16' })).toEqual({ from: '2026-08-18', to: '2026-09-16' })
    expect(previousRange({ from: '2026-10-10', to: '2026-10-10' })).toEqual({ from: '2026-10-09', to: '2026-10-09' })
  })
})

describe('percentDelta', () => {
  it('calcula la variación redondeada', () => {
    expect(percentDelta(115, 100)).toBe(15)
    expect(percentDelta(80, 100)).toBe(-20)
    expect(percentDelta(100, 100)).toBe(0)
  })

  it('sin base de comparación devuelve null, salvo que ambos sean cero', () => {
    expect(percentDelta(5, 0)).toBeNull()
    expect(percentDelta(0, 0)).toBe(0)
  })
})

describe('rangeLabel', () => {
  it('describe los atajos', () => {
    expect(rangeLabel({ type: '30d', from: '2026-09-17', to: '2026-10-16' })).toBe('Últimos 30 días')
    expect(rangeLabel({ type: 'year', from: '2026-01-01', to: '2026-10-16' })).toBe('Año 2026')
  })
})
