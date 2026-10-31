import { describe, it, expect } from 'vitest'
import { humanizeError } from './errorMessages'

describe('humanizeError', () => {
  it('traduce errores de red', () => {
    expect(humanizeError('TypeError: Failed to fetch')).toMatch(/Sin conexión/)
  })

  it('traduce errores de Postgres por código o texto', () => {
    expect(humanizeError('duplicate key value violates unique constraint "x"')).toMatch(/Ya existe/)
    expect(humanizeError('new row violates row-level security policy')).toMatch(/permiso/)
  })

  it('deja intactos los mensajes ya legibles', () => {
    expect(humanizeError('El monto debe ser mayor a cero')).toBe('El monto debe ser mayor a cero')
  })

  it('da un mensaje genérico si viene vacío', () => {
    expect(humanizeError('')).toMatch(/error inesperado/)
  })
})
