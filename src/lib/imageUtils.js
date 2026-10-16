// Redimensionado de imágenes en el navegador (canvas), para optimizar fotos
// antes de subirlas y generar miniaturas livianas.

export const isImage = (mimeType = '') => mimeType.startsWith('image/')

async function decode(file) {
  // 'from-image' respeta la orientación EXIF (fotos de celular tomadas en vertical)
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

/** Devuelve un Blob JPEG con el lado mayor limitado a `maxSide`, o null si no se pudo procesar. */
export async function resizeImage(file, maxSide, quality) {
  try {
    const bitmap = await decode(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width  = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // PNG con transparencia → fondo blanco en JPEG
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  } catch {
    return null // formato no soportado por el navegador (p. ej. HEIC en algunos equipos)
  }
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Miniatura cuadrada-proporcional (≈10-20 KB) como data URL, guardada junto al adjunto. */
export async function makeThumbnail(file, maxSide = 240) {
  const blob = await resizeImage(file, maxSide, 0.72)
  return blob ? blobToDataURL(blob) : null
}
