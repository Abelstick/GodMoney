import { IconWifiOff, IconCloudUpload } from '@tabler/icons-react'
import { useStore } from '@/store'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import styles from './OfflineBanner.module.css'

// Aviso fijo arriba del contenido: sin conexión, o con movimientos esperando sincronizarse.
export function OfflineBanner() {
  const online      = useOnlineStatus()
  const pending     = useStore((s) => s.offlinePending)
  const failed      = useStore((s) => s.offlineFailed)
  const syncing     = useStore((s) => s.offlineSyncing)
  const syncNow     = useStore((s) => s.syncOfflineQueue)

  if (online && pending === 0) return null

  const waiting = pending - failed
  let detail = ''
  if (pending > 0) {
    detail = `${waiting} pendiente${waiting !== 1 ? 's' : ''} de sincronizar`
    if (failed > 0) detail += ` · ${failed} con error`
  }

  return (
    <div className={`${styles.banner} ${online ? styles.syncBanner : ''}`} role="status">
      {online ? <IconCloudUpload size={16} stroke={1.75} /> : <IconWifiOff size={16} stroke={1.75} />}
      <span className={styles.text}>
        {online
          ? detail
          : `Sin conexión. Puedes registrar gastos e ingresos; se enviarán al volver internet.${detail ? ` (${detail})` : ''}`}
      </span>
      {online && waiting > 0 && (
        <button type="button" className={styles.btn} onClick={syncNow} disabled={syncing}>
          {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  )
}
