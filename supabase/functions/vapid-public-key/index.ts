// Endpoint público (sin autenticación): expone solo la clave pública VAPID
// para que el navegador pueda suscribirse a Web Push (pushManager.subscribe).
// La clave privada nunca sale de las variables de entorno de esta función.
import * as webpush from 'jsr:@negrel/webpush'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  // supabase-js manda x-client-info en cada request (incluido functions.invoke) —
  // sin permitirlo aquí, el preflight falla y el navegador bloquea la
  // petición antes de que llegue (curl no sufre esto: no aplica CORS).
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

let publicKeyPromise: Promise<string> | null = null

async function getPublicKey(): Promise<string> {
  if (!publicKeyPromise) {
    const raw = Deno.env.get('VAPID_KEYS_JSON')
    if (!raw) throw new Error('Falta el secret VAPID_KEYS_JSON')
    publicKeyPromise = webpush.importVapidKeys(JSON.parse(raw), { extractable: false })
      .then((vapidKeys) => webpush.exportApplicationServerKey(vapidKeys))
  }
  return publicKeyPromise
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const publicKey = await getPublicKey()
    return new Response(JSON.stringify({ publicKey }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
