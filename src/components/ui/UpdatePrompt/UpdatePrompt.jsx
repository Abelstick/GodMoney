import { useEffect } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { IconRefresh } from '@tabler/icons-react'
import { useStore } from '@/store'
import styles from './UpdatePrompt.module.css'

const HOUR = 60 * 60 * 1000

// Aviso de versión nueva. El service worker nuevo espera (no se activa solo)
// hasta que el usuario pulsa "Actualizar": así nunca se mezclan archivos de
// dos versiones en una pestaña abierta ni se pierde un formulario a medias.
export function UpdatePrompt() {
  const showToast = useStore((s) => s.showToast)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // La app instalada puede quedar abierta días: buscar versiones cada hora.
      if (registration) setInterval(() => registration.update().catch(() => {}), HOUR)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    showToast('GodMoney ya funciona sin conexión', 'success')
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady, showToast])

  return (
    <AnimatePresence>
      {needRefresh && (
        <m.div
          className={styles.wrap}
          role="status"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className={styles.icon} aria-hidden="true"><IconRefresh size={18} stroke={1.9} /></span>
          <span className={styles.text}>
            <strong>Hay una versión nueva</strong>
            <span>Actualiza para usar las últimas mejoras.</span>
          </span>
          <button type="button" className={styles.later} onClick={() => setNeedRefresh(false)}>
            Luego
          </button>
          <button type="button" className={styles.update} onClick={() => updateServiceWorker(true)}>
            Actualizar
          </button>
        </m.div>
      )}
    </AnimatePresence>
  )
}
