import { supabase } from '@/lib/supabase'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

// La clave pública VAPID no es secreta, pero vive del lado de la Edge
// Function (junto a la privada) porque la librería usada para firmar los
// envíos (jsr:@negrel/webpush) la exporta en un formato derivado de las
// claves reales — se pide en vivo en vez de duplicarla a mano como
// variable de build, para no arriesgarnos a que queden desincronizadas.
async function fetchVapidPublicKey() {
  const { data, error } = await supabase.functions.invoke('vapid-public-key')
  if (error) throw new Error('No se pudo obtener la clave pública VAPID')
  return data.publicKey
}

// El plugin PWA no registra service worker en `npm run dev`
// (vite.config.js: devOptions.enabled = false, para evitar conflictos en
// desarrollo). Sin un registro existente, `navigator.serviceWorker.ready`
// se queda esperando para siempre uno que nunca llega — se falla rápido
// en vez de colgar el botón indefinidamente.
async function getReadyRegistration() {
  const existing = await navigator.serviceWorker.getRegistration()
  if (!existing) {
    throw new Error('No hay un service worker activo. Las notificaciones push solo funcionan sobre un build de producción: usa "npm run build && npm run preview", o pruébalo en el sitio ya desplegado.')
  }
  return navigator.serviceWorker.ready
}

// Brave expone este objeto (Chrome/Edge no) — se usa solo para dar un
// mensaje de error específico, nunca para ocultar la función en sí.
async function isBrave() {
  return !!(navigator.brave && (await navigator.brave.isBrave()))
}

const BRAVE_HINT = 'Brave bloquea por defecto el servicio de push de Google. Activa "Usar servicios de Google para mensajes push" en brave://settings/privacy, recarga la página e inténtalo de nuevo.'

export const pushSubscriptionService = {
  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window
  },

  async getCurrentSubscription() {
    if (!this.isSupported()) return null
    const existing = await navigator.serviceWorker.getRegistration()
    if (!existing) return null
    const registration = await navigator.serviceWorker.ready
    return registration.pushManager.getSubscription()
  },

  async subscribe() {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') throw new Error('Permiso de notificaciones denegado')

    const vapidPublicKey = await fetchVapidPublicKey()
    const registration = await getReadyRegistration()

    let subscription
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    } catch (err) {
      if (await isBrave()) throw new Error(BRAVE_HINT)
      throw err
    }

    const json = subscription.toJSON()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: 'endpoint' }
      )
    if (error) throw error

    return subscription
  },

  async unsubscribe() {
    const subscription = await this.getCurrentSubscription()
    if (!subscription) return
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  },
}
