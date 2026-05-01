import { useState, useEffect } from 'react'
import { IconDownload, IconX } from '@tabler/icons-react'
import styles from './InstallPrompt.module.css'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [visible, setVisible]               = useState(false)

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Solo mostrar si el usuario no lo descartó antes
      const dismissed = sessionStorage.getItem('pwa-dismissed')
      if (!dismissed) setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setVisible(false)
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <span className={styles.icon}>💎</span>
        <div>
          <div className={styles.title}>Instalar GodMoney</div>
          <div className={styles.subtitle}>Accede sin internet, como una app nativa</div>
        </div>
      </div>
      <div className={styles.actions}>
        <button className={styles.installBtn} onClick={handleInstall}>
          <IconDownload size={14} stroke={2} />
          Instalar
        </button>
        <button className={styles.dismissBtn} onClick={handleDismiss} aria-label="Cerrar">
          <IconX size={14} stroke={2} />
        </button>
      </div>
    </div>
  )
}
