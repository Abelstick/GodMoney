import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  EXPORT_TABLES, NOT_EXPORTED_TABLES, buildAccountExport, clearLocalUserData, exportFilename,
} from './accountData'

const SUPABASE = join(process.cwd(), 'supabase')

function tablesInSql() {
  const files = [
    join(SUPABASE, 'schema.sql'),
    ...readdirSync(join(SUPABASE, 'migrations')).map((f) => join(SUPABASE, 'migrations', f)),
  ]
  const sql = files.map((f) => readFileSync(f, 'utf8')).join('\n')
  return [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?([a-z_]+)/gi)].map((m) => m[1])
}

describe('cobertura de la exportación', () => {
  it('toda tabla está exportada o excluida a propósito', () => {
    const known = new Set([...Object.keys(EXPORT_TABLES), ...Object.keys(NOT_EXPORTED_TABLES)])
    const missing = [...new Set(tablesInSql())].filter((t) => !known.has(t))
    expect(missing).toEqual([])
  })

  it('no lista tablas que no existen ni repite ninguna', () => {
    const real = new Set(tablesInSql())
    const exported = Object.keys(EXPORT_TABLES)
    const excluded = Object.keys(NOT_EXPORTED_TABLES)
    expect([...exported, ...excluded].filter((t) => !real.has(t))).toEqual([])
    expect(exported.filter((t) => excluded.includes(t))).toEqual([])
  })
})

describe('buildAccountExport', () => {
  const user = { id: 'u1', email: 'a@b.c', app_metadata: { provider: 'google' } }
  const data = {
    profiles: [{ id: 'u1', full_name: 'Ana', gemini_api_key: 'AIza-secreta', telegram_chat_id: '123' }],
    expenses: [{ id: 'e1', amount: 10 }],
  }
  const now = new Date('2026-11-06T17:00:00Z')

  it('no incluye secretos en ningún lugar del archivo', () => {
    const text = JSON.stringify(buildAccountExport(user, data, now))
    expect(text).not.toContain('AIza-secreta')
    expect(text).not.toContain('gemini_api_key')
    expect(text).not.toContain('telegram_chat_id')
  })

  it('conserva los datos y no modifica los originales', () => {
    const out = buildAccountExport(user, data, now)
    expect(out.data.expenses).toEqual(data.expenses)
    expect(out.data.profiles[0].full_name).toBe('Ana')
    expect(data.profiles[0].gemini_api_key).toBe('AIza-secreta')
  })

  it('identifica la cuenta, la fecha y la versión del formato', () => {
    expect(buildAccountExport(user, data, now)).toMatchObject({
      app: 'GodMoney', formatVersion: 1, exportedAt: '2026-11-06T17:00:00.000Z', account: { id: 'u1', email: 'a@b.c' },
    })
  })

  it('el nombre del archivo lleva la fecha', () => {
    expect(exportFilename(new Date(2026, 10, 6))).toBe('godmoney-datos-2026-11-06.json')
  })
})

describe('clearLocalUserData', () => {
  function fakeStorage(initial) {
    const map = new Map(Object.entries(initial))
    return {
      get length() { return map.size },
      key: (i) => [...map.keys()][i] ?? null,
      removeItem: (k) => map.delete(k),
      keys: () => [...map.keys()],
    }
  }

  it('borra solo lo de la app y conserva el tema', () => {
    const storage = fakeStorage({
      'godmoney.simulator.draft': '{}',
      'godmoney:offline-queue': '[]',
      'gm.quickadd.type': '"expense"',
      'mantine-color-scheme-value': 'dark',
      'otra-web': '1',
    })
    clearLocalUserData(storage)
    expect(storage.keys()).toEqual(['mantine-color-scheme-value', 'otra-web'])
  })

  it('tolera un almacenamiento no disponible', () => {
    expect(() => clearLocalUserData(null)).not.toThrow()
  })
})
