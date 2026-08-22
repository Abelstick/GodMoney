import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button/Button'
import styles from './AccountCard.module.css'

export function AccountCard({ account, onEdit, onDelete }) {
  const isNegative = Number(account.balance) < 0

  return (
    <div className={styles.card} style={{ '--account-color': account.color }}>
      <div className={styles.top}>
        <div className={styles.iconWrap} style={{ background: account.color + '20' }}>💳</div>
        <div className={styles.name}>{account.name}</div>
      </div>

      <div className={`${styles.balance} ${isNegative ? styles.negative : ''}`}>
        {formatCurrency(account.balance)}
      </div>

      <div className={styles.actions}>
        <Button size="sm" variant="secondary" onClick={() => onEdit(account)}>Editar</Button>
        <Button size="sm" variant="danger"    onClick={() => onDelete(account.id)}>Eliminar</Button>
      </div>
    </div>
  )
}
