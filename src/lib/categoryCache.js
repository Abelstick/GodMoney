// Última lista de categorías vista, por tipo. Permite abrir el formulario y
// mostrar la categoría de un movimiento pendiente cuando no hay conexión.
const KEY = 'godmoney:categories'

function storage() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

function readAll() {
  try { return JSON.parse(storage()?.getItem(KEY) ?? '{}') ?? {} } catch { return {} }
}

export const categoryCache = {
  get(type) {
    return readAll()[type ?? 'all'] ?? null
  },

  set(type, categories) {
    try {
      storage()?.setItem(KEY, JSON.stringify({ ...readAll(), [type ?? 'all']: categories }))
    } catch { /* sin almacenamiento */ }
  },

  /** Busca una categoría por id en la lista guardada del tipo (o en cualquiera). */
  find(type, id) {
    const all = readAll()
    const lists = [all[type], all.all, ...Object.values(all)].filter(Array.isArray)
    for (const list of lists) {
      const found = list.find((c) => c.id === id)
      if (found) return { id: found.id, name: found.name, color: found.color, icon: found.icon, is_savings: found.is_savings }
    }
    return null
  },
}
