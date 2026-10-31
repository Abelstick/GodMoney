// Categorías sugeridas como chips en el registro rápido, en este orden:
// 1. las últimas que el usuario eligió en el registro rápido (`lastUsed`),
// 2. las más frecuentes en los movimientos ya cargados (desempate: la más reciente),
// 3. el resto de categorías en su orden original, para completar.
// Solo devuelve ids que siguen existiendo en `categories`.
export function getRecentCategoryIds({ lastUsed = [], transactions = [], categories = [], limit = 6 }) {
  const valid = new Set(categories.map((c) => c.id))
  const result = []
  const push = (id) => {
    if (id && valid.has(id) && !result.includes(id) && result.length < limit) result.push(id)
  }

  lastUsed.forEach(push)

  const stats = new Map()
  for (const tx of transactions) {
    if (!tx.category_id) continue
    const s = stats.get(tx.category_id) ?? { count: 0, latest: '' }
    s.count += 1
    if ((tx.date ?? '') > s.latest) s.latest = tx.date ?? ''
    stats.set(tx.category_id, s)
  }
  ;[...stats.entries()]
    .sort(([, a], [, b]) => b.count - a.count || b.latest.localeCompare(a.latest))
    .forEach(([id]) => push(id))

  categories.forEach((c) => push(c.id))
  return result
}

// Agrega `id` al frente del historial de últimas usadas, sin repetir.
export function rememberCategory(lastUsed, id, max = 6) {
  if (!id) return lastUsed
  return [id, ...lastUsed.filter((x) => x !== id)].slice(0, max)
}
