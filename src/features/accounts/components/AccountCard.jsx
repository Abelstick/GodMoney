import { useState } from 'react'
import { IconWallet, IconX, IconChevronRight } from '@tabler/icons-react'
import { formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/Button/Button'
import { Badge } from '@/components/ui/Badge/Badge'
import styles from './AccountCard.module.css'

export function AccountCard({
  account, pendingDebt = 0, canMove = true,
  onOpen, onWithdraw, onRepay, onEdit, onDelete, onAdjustBalance,
}) {
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
      <button type="button" className={styles.open} onClick={onOpen} aria-label={`Ver detalle de ${account.name}`}>
        <div className={styles.top}>
          <div className={styles.iconWrap} style={{ background: account.color + '20', color: account.color }}>
            <IconWallet size={20} stroke={1.75} />
          </div>
          <div className={styles.name}>{account.name}</div>
          {account.is_savings && <Badge color="var(--color-success)">Ahorro</Badge>}
          <IconChevronRight size={18} stroke={1.75} className={styles.chevron} />
        </div>

        <div className={`${styles.balance} ${isNegative ? styles.negative : ''}`}>
          {formatCurrency(account.balance)}
        </div>

        {pendingDebt > 0 && (
          <div className={styles.debt}>
            <span>Por reponer</span>
            <strong>{formatCurrency(pendingDebt)}</strong>
          </div>
        )}
      </button>

      {(account.is_savings || pendingDebt > 0) && canMove && (
        <div className={styles.savingsActions}>
          {account.is_savings && <Button size="sm" variant="secondary" onClick={onWithdraw}>Saqué dinero</Button>}
          <Button size="sm" variant="success" onClick={onRepay}>Reponer</Button>
        </div>
      )}

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
          <Button size="sm" variant="ghost" onClick={() => setAdjusting(false)} aria-label="Cancelar ajuste">
            <IconX size={15} stroke={1.75} />
          </Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={() => setAdjusting(true)}>Ajustar saldo</Button>
          <Button size="sm" variant="ghost" onClick={() => onEdit(account)}>Editar</Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(account.id)}>Eliminar</Button>
        </div>
      )}
    </div>
  )
}
