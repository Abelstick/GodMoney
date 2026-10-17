import { useState, useEffect } from 'react'

// useState que recuerda su valor en localStorage. Si el almacenamiento falla
// (modo privado, datos bloqueados) o el valor guardado ya no es válido, usa
// `initial` y la pantalla funciona igual, sin recordar.
// `isValid` descarta valores obsoletos (p. ej. una opción de orden que ya no existe).
export function usePersistentState(key, initial, isValid = () => true) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) {
        const parsed = JSON.parse(raw)
        if (isValid(parsed)) return parsed
      }
    } catch { /* se usa el valor inicial */ }
    return initial
  })

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
  }, [key, value])

  return [value, setValue]
}
