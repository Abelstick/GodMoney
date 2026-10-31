import { useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import { IconCheck, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react'
import { useStore } from '@/store'
import { humanizeError } from '@/lib/errorMessages'
import styles from './ToastBridge.module.css'

const TYPES = {
  success: { color: 'income',  Icon: IconCheck,       autoClose: 3000 },
  error:   { color: 'expense', Icon: IconAlertCircle, autoClose: 6000 },
  info:    { color: 'brand',   Icon: IconInfoCircle,  autoClose: 3500 },
}

// El store sigue exponiendo showToast(message, type, action); aquí cada aviso
// nuevo se pasa a Mantine Notifications (apilables, accesibles, con cierre).
export function ToastBridge() {
  const toast      = useStore((s) => s.toast)
  const clearToast = useStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    const { color, Icon, autoClose } = TYPES[toast.type] ?? TYPES.info
    const id = `toast-${toast.id}`
    const text = toast.type === 'error' ? humanizeError(toast.message) : toast.message

    notifications.show({
      id,
      color,
      icon: <Icon size={18} stroke={2} />,
      // Con botón de acción (Deshacer) se da más tiempo para alcanzarlo.
      autoClose: toast.action ? 8000 : autoClose,
      message: toast.action ? (
        <span className={styles.row}>
          <span>{text}</span>
          <button
            type="button"
            className={styles.action}
            onClick={() => { notifications.hide(id); toast.action.onClick() }}
          >
            {toast.action.label}
          </button>
        </span>
      ) : text,
    })
    clearToast()
  }, [toast, clearToast])

  return null
}
