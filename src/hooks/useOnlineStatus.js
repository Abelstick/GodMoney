import { useState, useEffect } from 'react'

// true mientras el navegador tenga conexión. Los eventos online/offline son una
// pista (puede haber wifi sin internet); los fallos reales de red se detectan al enviar.
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine !== false)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}
