// Borra las respuestas de la API guardadas por el service worker (src/sw.js)
// para que, al cerrar sesión, no queden datos financieros en el dispositivo.
// Se borra desde la página (Cache Storage es del mismo origen) y además se
// avisa al SW por si la página no tiene acceso directo.
const DATA_CACHE = 'supabase-api'

export async function clearDataCache() {
  try {
    if ('caches' in window) await caches.delete(DATA_CACHE)
    navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_DATA_CACHE' })
  } catch {
    // Sin Cache Storage (navegación privada): no hay nada que borrar.
  }
}
