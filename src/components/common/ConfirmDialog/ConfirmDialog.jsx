import { Modal }  from '@/components/common/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import styles from './ConfirmDialog.module.css'

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title       = '¿Eliminar?',
  description = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Eliminar',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className={styles.body}>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
