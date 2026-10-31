// Traduce errores técnicos (red, Supabase/Postgres) a mensajes que el usuario
// entienda. Si el mensaje ya es legible (los que escribe la app), se deja igual.
const RULES = [
  [/failed to fetch|networkerror|network request failed|load failed|fetch failed/i,
    'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.'],
  [/jwt|token.*expired|not authenticated|auth session missing|invalid refresh token/i,
    'Tu sesión expiró. Vuelve a iniciar sesión.'],
  [/row-level security|permission denied|42501/i,
    'No tienes permiso para hacer esta acción.'],
  [/duplicate key|already exists|23505/i,
    'Ya existe un registro con esos datos.'],
  [/foreign key|23503/i,
    'No se puede completar porque hay datos relacionados.'],
  [/check constraint|23514|invalid input syntax|22P02/i,
    'Algún dato no es válido. Revisa los campos e inténtalo de nuevo.'],
  [/value too long|22001/i,
    'Algún texto es demasiado largo.'],
  [/timeout|timed out|57014/i,
    'El servidor tardó demasiado en responder. Inténtalo de nuevo.'],
  [/quota|rate limit|too many requests|429/i,
    'Demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.'],
]

export function humanizeError(message) {
  const text = String(message ?? '').trim()
  if (!text) return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
  for (const [pattern, friendly] of RULES) {
    if (pattern.test(text)) return friendly
  }
  return text
}
