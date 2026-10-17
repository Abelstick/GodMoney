import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createOfflineQueue, mergePending, isRetryableError, isDuplicateKey, toPendingRow } from './offlineQueue'
import { categoryCache } from './categoryCache'
import { readCachedUser } from './cachedSession'

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    get length() { return data.size },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)) },
  }
}

const item = (id, kind, date, extra = {}) => ({
  id, kind, queuedAt: `2026-10-16T10:0${id.length}:00Z`, payload: { id, amount: 10, date, ...extra },
})

describe('cola sin conexión', () => {
  let queue
  beforeEach(() => {
    vi.unstubAllGlobals()
    queue = createOfflineQueue(fakeStorage())
  })

  it('empieza vacía', () => {
    expect(queue.all()).toEqual([])
  })

  it('agrega, busca y quita elementos conservando el orden', () => {
    queue.add(item('a', 'expense', '2026-10-01'))
    queue.add(item('bb', 'income', '2026-10-02'))
    expect(queue.all().map((i) => i.id)).toEqual(['a', 'bb'])
    expect(queue.has('a')).toBe(true)
    queue.remove('a')
    expect(queue.all().map((i) => i.id)).toEqual(['bb'])
    expect(queue.has('a')).toBe(false)
  })

  it('persiste entre instancias que comparten almacenamiento', () => {
    const storage = fakeStorage()
    createOfflineQueue(storage).add(item('a', 'expense', '2026-10-01'))
    expect(createOfflineQueue(storage).all()).toHaveLength(1)
  })

  it('markFailed guarda el error sin perder el movimiento', () => {
    queue.add(item('a', 'expense', '2026-10-01'))
    queue.markFailed('a', 'violates check constraint')
    expect(queue.all()[0]).toMatchObject({ id: 'a', error: 'violates check constraint' })
  })

  it('tolera JSON dañado o sin almacenamiento', () => {
    expect(createOfflineQueue(fakeStorage({ 'godmoney:offline-queue': '{no es json' })).all()).toEqual([])
    expect(createOfflineQueue(fakeStorage({ 'godmoney:offline-queue': '{"a":1}' })).all()).toEqual([])
    const noStorage = createOfflineQueue(null)
    expect(() => noStorage.add(item('a', 'expense', '2026-10-01'))).not.toThrow()
    expect(noStorage.all()).toEqual([])
  })

  it('pendingRows filtra por tipo y rango, y muestra primero lo último registrado', () => {
    queue.add(item('a', 'expense', '2026-10-01'))
    queue.add(item('bb', 'expense', '2026-10-15'))
    queue.add(item('ccc', 'expense', '2026-11-02'))   // fuera del rango
    queue.add(item('dddd', 'income', '2026-10-10'))   // otro tipo
    const rows = queue.pendingRows('expense', '2026-10-01', '2026-10-31')
    expect(rows.map((r) => r.id)).toEqual(['bb', 'a'])
    expect(rows.every((r) => r._pending)).toBe(true)
  })
})

describe('toPendingRow', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('tiene la forma de una fila de la base, marcada como pendiente', () => {
    const row = toPendingRow({ id: 'a', kind: 'expense', queuedAt: '2026-10-16T10:00:00Z', payload: { id: 'a', amount: 5, date: '2026-10-16', description: 'Taxi' } })
    expect(row).toMatchObject({
      id: 'a', amount: 5, description: 'Taxi', tags: [], attachments: [], notes: null,
      created_at: '2026-10-16T10:00:00Z', category: null, _pending: true, _syncError: null,
    })
  })

  it('expone el error de sincronización', () => {
    const row = toPendingRow({ id: 'a', kind: 'income', queuedAt: 'x', error: 'rechazado', payload: { id: 'a', date: '2026-10-16' } })
    expect(row._syncError).toBe('rechazado')
  })

  it('resuelve la categoría desde la caché local', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    categoryCache.set('expense', [{ id: 'c1', name: 'Comida', color: '#f00', icon: 'x', is_savings: false, extra: 'no' }])
    const row = toPendingRow({ id: 'a', kind: 'expense', queuedAt: 'x', payload: { id: 'a', category_id: 'c1', date: '2026-10-16' } })
    expect(row.category).toEqual({ id: 'c1', name: 'Comida', color: '#f00', icon: 'x', is_savings: false })
  })
})

describe('mergePending', () => {
  it('pone primero los pendientes y no repite los que ya están en el servidor', () => {
    const server = [{ id: 's1' }, { id: 'p2' }]
    const pending = [{ id: 'p1' }, { id: 'p2' }]
    expect(mergePending(server, pending).map((r) => r.id)).toEqual(['p1', 's1', 'p2'])
  })
})

describe('isRetryableError', () => {
  it('sin conexión siempre se reintenta', () => {
    expect(isRetryableError(new Error('lo que sea'), false)).toBe(true)
  })

  it('reconoce fallos de red de distintos navegadores', () => {
    for (const msg of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'Network request failed']) {
      expect(isRetryableError({ message: msg }, true)).toBe(true)
    }
    expect(isRetryableError(new TypeError('x'), true)).toBe(true)
  })

  it('una sesión caducada se reintenta cuando se renueve', () => {
    expect(isRetryableError({ message: 'No hay sesión activa' }, true)).toBe(true)
    expect(isRetryableError({ message: 'JWT expired' }, true)).toBe(true)
    expect(isRetryableError({ status: 401, message: 'x' }, true)).toBe(true)
    expect(isRetryableError({ code: 'PGRST301', message: 'x' }, true)).toBe(true)
  })

  it('un rechazo del servidor no se reintenta', () => {
    expect(isRetryableError({ code: '23514', message: 'violates check constraint' }, true)).toBe(false)
    expect(isRetryableError({ code: '42501', message: 'row-level security' }, true)).toBe(false)
  })
})

describe('isDuplicateKey', () => {
  it('detecta la clave duplicada de Postgres', () => {
    expect(isDuplicateKey({ code: '23505' })).toBe(true)
    expect(isDuplicateKey({ code: '23514' })).toBe(false)
    expect(isDuplicateKey(null)).toBe(false)
  })
})

describe('readCachedUser', () => {
  it('lee el usuario de la sesión guardada por Supabase', () => {
    const storage = fakeStorage({
      otra: '1',
      'sb-abcdef-auth-token': JSON.stringify({ access_token: 't', user: { id: 'u1', email: 'a@b.c' } }),
    })
    expect(readCachedUser(storage)).toEqual({ id: 'u1', email: 'a@b.c' })
  })

  it('devuelve null sin sesión, con JSON dañado o sin usuario', () => {
    expect(readCachedUser(fakeStorage())).toBeNull()
    expect(readCachedUser(fakeStorage({ 'sb-x-auth-token': '{roto' }))).toBeNull()
    expect(readCachedUser(fakeStorage({ 'sb-x-auth-token': '{"access_token":"t"}' }))).toBeNull()
    expect(readCachedUser(null)).toBeNull()
  })
})
