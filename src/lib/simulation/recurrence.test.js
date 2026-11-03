import { describe, it, expect } from 'vitest'
import { expandOccurrences, biweeklyDays, repeatLabel } from './recurrence'

const ev = (date, repeat, until = null) => ({ date, repeat, until })

describe('expandOccurrences', () => {
  it('evento único: solo si cae dentro del rango', () => {
    expect(expandOccurrences(ev('2026-11-10', 'once'), '2026-11-02', '2026-12-02')).toEqual(['2026-11-10'])
    expect(expandOccurrences(ev('2026-10-30', 'once'), '2026-11-02', '2026-12-02')).toEqual([])
    expect(expandOccurrences(ev('2026-12-03', 'once'), '2026-11-02', '2026-12-02')).toEqual([])
  })

  it('diario incluye ambos extremos', () => {
    expect(expandOccurrences(ev('2026-11-01', 'daily'), '2026-11-02', '2026-11-05'))
      .toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'])
  })

  it('semanal mantiene el día de la semana del ancla aunque empiece antes', () => {
    // 2026-10-26 es lunes
    expect(expandOccurrences(ev('2026-10-26', 'weekly'), '2026-11-04', '2026-11-30'))
      .toEqual(['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30'])
  })

  it('mensual: el día 31 cae a fin de mes y vuelve a 31 (no se corre)', () => {
    expect(expandOccurrences(ev('2027-01-31', 'monthly'), '2027-01-01', '2027-05-31'))
      .toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31'])
  })

  it('mensual: año bisiesto', () => {
    expect(expandOccurrences(ev('2028-01-30', 'monthly'), '2028-02-01', '2028-02-29')).toEqual(['2028-02-29'])
  })

  it('quincenal: dos veces al mes separadas 15 días', () => {
    expect(biweeklyDays(7)).toEqual([7, 22])
    expect(biweeklyDays(20)).toEqual([5, 20])
    expect(expandOccurrences(ev('2026-11-07', 'biweekly'), '2026-11-01', '2026-12-31'))
      .toEqual(['2026-11-07', '2026-11-22', '2026-12-07', '2026-12-22'])
  })

  it('quincenal no genera fechas anteriores al ancla', () => {
    // Ancla el 20: el día 5 de ese mismo mes no cuenta
    expect(expandOccurrences(ev('2026-11-20', 'biweekly'), '2026-11-01', '2026-12-10'))
      .toEqual(['2026-11-20', '2026-12-05'])
  })

  it('quincenal día 15 en febrero: 15 y fin de mes, sin duplicar', () => {
    expect(expandOccurrences(ev('2027-01-15', 'biweekly'), '2027-02-01', '2027-02-28'))
      .toEqual(['2027-02-15', '2027-02-28'])
  })

  it('respeta la fecha "hasta"', () => {
    expect(expandOccurrences(ev('2026-11-05', 'monthly', '2027-01-04'), '2026-11-01', '2027-03-31'))
      .toEqual(['2026-11-05', '2026-12-05'])
  })

  it('nunca repite una fecha', () => {
    for (const repeat of ['daily', 'weekly', 'biweekly', 'monthly']) {
      const dates = expandOccurrences(ev('2026-01-31', repeat), '2026-01-01', '2027-12-31')
      expect(new Set(dates).size).toBe(dates.length)
      expect([...dates].sort()).toEqual(dates)
    }
  })

  it('rango invertido o evento sin fecha: nada', () => {
    expect(expandOccurrences(ev('2026-11-10', 'daily'), '2026-12-01', '2026-11-01')).toEqual([])
    expect(expandOccurrences({ repeat: 'daily' }, '2026-11-01', '2026-12-01')).toEqual([])
  })
})

describe('repeatLabel', () => {
  it('describe la repetición', () => {
    expect(repeatLabel('once', '2026-11-07')).toBe('Única vez')
    expect(repeatLabel('monthly', '2026-11-07')).toBe('Cada mes, día 7')
    expect(repeatLabel('biweekly', '2026-11-07')).toBe('Quincenal (días 7 y 22)')
    expect(repeatLabel('weekly', '2026-11-02')).toBe('Cada lunes')
  })
})
