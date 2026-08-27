import { useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button/Button'
import styles from './AccountCard.module.css'

export function AccountCard({ account, onEdit, onDelete, onAdjustBalance }) {
  const [adjusting, setAdjusting] = useState(false)
  const [amount, setAmount] = useState('')
  const isNegative = Number(account.balance) < 0

  async function handleAdjust(sign) {
    const value = Number(amount)
    if (!value || value <= 0) return
    await onAdjustBalance(account.id, value * sign)
    setAmount('')
    setAdjusting(false)
  }

  return (
    <div className={styles.card} style={{ '--account-color': account.color }}>
      <div className={styles.top}>
        <div className={styles.iconWrap} style={{ background: account.color + '20' }}>💳</div>
        <div className={styles.name}>{account.name}</div>
      </div>

      <div className={`${styles.balance} ${isNegative ? styles.negative : ''}`}>
        {formatCurrency(account.balance)}
      </div>

      {adjusting ? (
        <div className={styles.adjustRow}>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            className={styles.adjustInput}
          />
          <Button size="sm" variant="success" onClick={() => handleAdjust(1)}>+ Depositar</Button>
          <Button size="sm" variant="danger" onClick={() => handleAdjust(-1)}>− Retirar</Button>
          <Button size="sm" variant="ghost" onClick={() => setAdjusting(false)}>✕</Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button size="sm" variant="success" onClick={() => setAdjusting(true)}>Ajustar saldo</Button>
          <Button size="sm" variant="secondary" onClick={() => onEdit(account)}>Editar</Button>
          <Button size="sm" variant="danger"    onClick={() => onDelete(account.id)}>Eliminar</Button>
        </div>
      )}
    </div>
  )
}
