// Adjuntos en el Google Drive del propio usuario.
//
// Usa Google Identity Services (token client) con el scope `drive.file`, que
// solo da acceso a los archivos que crea esta app (no ve el resto del Drive).
// Funciona igual si el usuario entró con correo/contraseña o con Google.
// Requiere VITE_GOOGLE_CLIENT_ID (el mismo Client ID OAuth web) y la Drive API
// habilitada en el proyecto de Google Cloud.

import { isImage, resizeImage, makeThumbnail } from '@/lib/imageUtils'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPE     = 'https://www.googleapis.com/auth/drive.file'
const FOLDER    = 'GodMoney - Adjuntos'
const FOLDER_KEY = 'godmoney.drive.folderId'
const MAX_BYTES = 10 * 1024 * 1024

let gisPromise = null
let cachedToken = null // { value, expiresAt }

export const isDriveConfigured = Boolean(CLIENT_ID)

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { gisPromise = null; reject(new Error('No se pudo cargar Google. Revisa tu conexión.')) }
    document.head.appendChild(script)
  })
  return gisPromise
}

async function getAccessToken() {
  if (!CLIENT_ID) throw new Error('Falta configurar VITE_GOOGLE_CLIENT_ID para usar Google Drive.')
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value

  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (res) => {
        if (res.error) {
          reject(new Error(res.error === 'access_denied'
            ? 'Cancelaste el permiso de Google Drive.'
            : `Google Drive: ${res.error}`))
          return
        }
        cachedToken = { value: res.access_token, expiresAt: Date.now() + Number(res.expires_in) * 1000 }
        resolve(res.access_token)
      },
      error_callback: (err) => {
        const messages = {
          popup_failed_to_open: 'El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio e inténtalo de nuevo.',
          popup_closed: 'Cerraste la ventana de Google antes de aceptar el permiso.',
        }
        reject(new Error(messages[err?.type] ?? `No se completó la autorización de Google Drive (${err?.type ?? 'desconocido'}).`))
      },
    })
    client.requestAccessToken({ prompt: cachedToken ? '' : undefined })
  })
}

async function driveFetch(token, url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  })
  if (res.status === 401) cachedToken = null
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error?.message ?? res.statusText
    throw new Error(`Google Drive: ${msg}`)
  }
  return res.json()
}

async function ensureFolder(token) {
  const stored = localStorage.getItem(FOLDER_KEY)
  if (stored) {
    try {
      const f = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${stored}?fields=id,trashed`)
      if (!f.trashed) return f.id
    } catch { /* la carpeta ya no existe: se vuelve a buscar o crear */ }
  }

  const q = encodeURIComponent(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const found = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`)
  let id = found.files?.[0]?.id
  if (!id) {
    const created = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
    })
    id = created.id
  }
  localStorage.setItem(FOLDER_KEY, id)
  return id
}

/**
 * Sube un archivo al Drive del usuario y devuelve el adjunto a guardar en la BD.
 * Las imágenes se optimizan (máx. 2000 px) y se les genera una miniatura.
 */
export async function uploadAttachment(file) {
  // El permiso se pide primero: la ventana de Google solo se abre si ocurre
  // enseguida del clic del usuario (después de procesar la imagen se bloquearía).
  const token = await getAccessToken()

  let blob = file
  let name = file.name
  let thumb = null

  if (isImage(file.type)) {
    const optimized = await resizeImage(file, 2000, 0.85)
    if (optimized && optimized.size < file.size) {
      blob = optimized
      name = name.replace(/\.[^.]+$/, '') + '.jpg'
    }
    thumb = await makeThumbnail(file)
  }

  if (blob.size > MAX_BYTES) throw new Error('El archivo supera los 10 MB.')

  const folderId = await ensureFolder(token)

  const mimeType = blob === file ? file.type || 'application/octet-stream' : 'image/jpeg'
  const metadata = { name, parents: [folderId], mimeType }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([blob], { type: mimeType }))

  const data = await driveFetch(
    token,
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    { method: 'POST', body: form },
  )
  return { id: data.id, name: data.name, mimeType: data.mimeType, link: data.webViewLink, thumb }
}

/** Descarga el archivo completo desde Drive (para la vista ampliada). Devuelve un Blob. */
export async function fetchAttachmentBlob(id) {
  const token = await getAccessToken()
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) cachedToken = null
  if (!res.ok) throw new Error('No se pudo descargar el archivo de Drive.')
  return res.blob()
}
