// Cola de movimientos creados sin conexión. Se guarda en localStorage para que
// sobreviva a cerrar la app, y se envía a Supabase cuando vuelve internet.
//
// Cada elemento: { id, kind: 'expense' | 'income', payload, queuedAt, error? }.
// `id` lo genera el cliente y viaja dentro de `payload`: así un reintento
// (p. ej. la respuesta se perdió pero el insert sí llegó) choca con la clave
// primaria en vez de duplicar el movimiento, y se trata como ya sincronizado.
import { categoryCache } from './categoryCache'

const KEY = 'godmoney:offline-queue'

function defaultStorage() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

/** `storage` es inyectable (getItem/setItem) para poder probarla sin navegador. */
export function createOfflineQueue(storage = defaultStorage()) {
  function read() {
    try {
      const parsed = JSON.parse(storage?.getItem(KEY) ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  function write(items) {
    try { storage?.setItem(KEY, JSON.stringify(items)) } catch { /* sin almacenamiento */ }
  }

  return {
    all: read,
    add(item) { write([...read(), item]) },
    remove(id) { write(read().filter((i) => i.id !== id)) },
    // Marca un elemento como rechazado por el servidor; se conserva para no perder el dato.
    markFailed(id, error) { write(read().map((i) => (i.id === id ? { ...i, error } : i))) },
    has(id) { return read().some((i) => i.id === id) },

    /** Filas listas para mostrarse en la lista de `kind` dentro de [from, to]. */
    pendingRows(kind, from, to) {
      return read()
        .filter((i) => i.kind === kind && i.payload.date >= from && i.payload.date <= to)
        .map(toPendingRow)
        .reverse() // lo último registrado, primero
    },
  }
}

export const offlineQueue = createOfflineQueue()

/** Fila con la misma forma que una de la base, marcada como pendiente. */
export function toPendingRow(item) {
  const { payload } = item
  const category = payload.category_id
    ? categoryCache.find(item.kind, payload.category_id)
    : null
  return {
    tags: [],
    notes: null,
    attachments: [],
    description: null,
    ...payload,
    user_id: null,
    created_at: item.queuedAt,
    category,
    savings_account: null,
    _pending: true,
    _syncError: item.error ?? null,
  }
}

/** Filas del servidor + pendientes, sin repetir las que ya llegaron al servidor. */
export function mergePending(serverRows, pendingRows) {
  const serverIds = new Set(serverRows.map((r) => r.id))
  return [...pendingRows.filter((r) => !serverIds.has(r.id)), ...serverRows]
}

/** ¿El fallo es de conexión (o de sesión por reconectar) y vale la pena reintentar más tarde? */
export function isRetryableError(err, online = globalThis.navigator?.onLine !== false) {
  if (!online) return true
  const message = String(err?.message ?? '')
  if (err instanceof TypeError) return true
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message)) return true
  if (message === 'No hay sesión activa') return true
  return err?.status === 401 || err?.code === 'PGRST301' || /jwt expired/i.test(message)
}

/** Postgres 23505: la fila ya existe (un intento anterior sí llegó al servidor). */
export function isDuplicateKey(err) {
  return err?.code === '23505'
}
