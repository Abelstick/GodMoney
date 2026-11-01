import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Nombre compartido con src/lib/swCache.js (se purga al cerrar sesión).
const DATA_CACHE = 'supabase-api'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Datos: solo lecturas (GET) de la API REST, y solo como respaldo sin conexión
// (NetworkFirst: con red siempre se muestra lo último). Quedan fuera auth,
// storage (adjuntos) y edge functions. Respuestas opacas (status 0) no se
// guardan: no se puede saber si son errores.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET'
    && url.hostname.endsWith('.supabase.co')
    && url.pathname.startsWith('/rest/v1/'),
  new NetworkFirst({
    cacheName: DATA_CACHE,
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24, purgeOnQuotaError: true }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
)

registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
)

// Archivos de fuente: inmutables, para que la tipografía funcione offline.
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
)

self.addEventListener('message', (event) => {
  if (!event.source?.url?.startsWith(self.location.origin)) return
  // El usuario aceptó actualizar (UpdatePrompt): activar la versión en espera.
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  // Cierre de sesión: no dejar datos financieros del usuario en el dispositivo.
  if (event.data?.type === 'CLEAR_DATA_CACHE') event.waitUntil(caches.delete(DATA_CACHE))
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'GodMoney', body: event.data?.text() ?? '' }
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'GodMoney', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      data: { url: data.url ?? '/pagos-recurrentes' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data?.url ?? '/'
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      const existing = clientsList.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
