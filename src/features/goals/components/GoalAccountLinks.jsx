import { useMemo, useState } from 'react'
import { formatCurrency } from '@/lib/formatters'
import { Select } from '@/components/ui/Select/Select'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { getAccountHeadroom, getHonoredAmount, computeAccountUsage } from '@/lib/goalProgress'
import styles from './GoalAccountLinks.module.css'

export function GoalAccountLinks({ goal, accounts, allLinks, onLink, onUnlink }) {
  const [formMode, setFormMode] = useState(null) // null | 'add' | linkId being edited
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')

  const links = allLinks.filter((l) => l.goal_id === goal.id)
  const usage = useMemo(() => computeAccountUsage(allLinks), [allLinks])
  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])

  const editingLink = typeof formMode === 'string' && formMode !== 'add'
    ? links.find((l) => l.id === formMode)
    : null

  const headroom = accountId ? getAccountHeadroom(accountId, allLinks, accountsById, goal.id) : null
  const overAllocated = headroom !== null && Number(amount) > headroom && headroom >= 0

  const availableAccounts = accounts.filter((a) => !links.some((l) => l.account_id === a.id))
  const accountOptions = [
    { value: '', label: 'Selecciona una cuenta' },
    ...availableAccounts.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ]

  function startAdd() {
    setAccountId('')
    setAmount('')
    setFormMode('add')
  }

  function startEdit(link) {
    setAccountId(link.account_id)
    setAmount(String(link.allocated_amount))
    setFormMode(link.id)
  }

  function handleSave() {
    if (!accountId || !amount || Number(amount) <= 0) return
    onLink(goal.id, accountId, Number(amount))
    setFormMode(null)
  }

  return (
    <div className={styles.wrapper}>
      {links.length > 0 && (
        <div className={styles.list}>
          {links.map((l) => {
            const honored = getHonoredAmount(l, accountsById, usage)
            const isShort = honored < Number(l.allocated_amount) - 0.005
            return (
              <div key={l.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.accountName}>{accountsById[l.account_id]?.name ?? '—'}</span>
                  <span className={styles.rowAmount}>
                    {formatCurrency(honored)} de {formatCurrency(l.allocated_amount)} asignado
                    {isShort && <span className={styles.shortTag}> · cuenta con menos saldo del asignado</span>}
                  </span>
                </div>
                <button className={styles.editBtn} onClick={() => startEdit(l)}>Editar</button>
                <button className={styles.unlinkBtn} onClick={() => onUnlink(l.id)}>Quitar</button>
              </div>
            )
          })}
        </div>
      )}

      {formMode ? (
        <div className={styles.addForm}>
          {editingLink ? (
            <p className={styles.editingHint}>
              Editando monto asignado a <strong>{accountsById[editingLink.account_id]?.name}</strong>
            </p>
          ) : (
            <Select label="Cuenta" options={accountOptions} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          )}
          <Input label="Monto asignado a este objetivo" type="number" min="0" step="0.01" prefix="S/"
            value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={!!editingLink} />
          {headroom !== null && (
            <p className={styles.headroomHint}>
              Disponible sin comprometer en esta cuenta: {formatCurrency(Math.max(headroom, 0))}
            </p>
          )}
          {overAllocated && (
            <p className={styles.warning}>⚠️ Asignas más de lo disponible en esa cuenta ahora mismo.</p>
          )}
          <div className={styles.addActions}>
            <Button size="sm" variant="secondary" onClick={() => setFormMode(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={!accountId || !amount}>
              {overAllocated ? 'Guardar de todas formas' : editingLink ? 'Guardar monto' : 'Vincular cuenta'}
            </Button>
          </div>
        </div>
      ) : (
        availableAccounts.length > 0 && (
          <button className={styles.addLinkBtn} onClick={startAdd}>+ Vincular cuenta</button>
        )
      )}
    </div>
  )
}
