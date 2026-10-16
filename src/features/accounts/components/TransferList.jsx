import { IconArrowRight, IconTrash } from '@tabler/icons-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import styles from './TransferList.module.css'

export function TransferList({ transfers, onDelete }) {
  return (
    <ul className={styles.list}>
      {transfers.map((t) => (
        <li key={t.id} className={styles.item}>
          <div className={styles.info}>
            <div className={styles.route}>
              <span>{t.from_account?.name ?? 'Cuenta eliminada'}</span>
              <IconArrowRight size={14} stroke={1.75} aria-label="hacia" />
              <span>{t.to_account?.name ?? 'Cuenta eliminada'}</span>
            </div>
            <div className={styles.meta}>
              {formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}
            </div>
          </div>
          <span className={styles.amount}>{formatCurrency(t.amount)}</span>
          <button className={styles.delete} onClick={() => onDelete(t.id)} aria-label="Eliminar transferencia">
            <IconTrash size={15} stroke={1.75} />
          </button>
        </li>
      ))}
    </ul>
  )
}
