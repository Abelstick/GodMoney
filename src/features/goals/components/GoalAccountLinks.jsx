import { useMemo, useState } from 'react'
import { SegmentedControl } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { formatCurrency } from '@/lib/formatters'
import { Select } from '@/components/ui/Select/Select'
import { Input } from '@/components/ui/Input/Input'
import { Button } from '@/components/ui/Button/Button'
import { ALLOCATION_MODE, getLinkMode, getAccountHeadroom, resolveAllocations } from '@/lib/goalProgress'
import styles from './GoalAccountLinks.module.css'

const MODE_OPTIONS = [
  { value: ALLOCATION_MODE.ALL,   label: 'Toda la cuenta' },
  { value: ALLOCATION_MODE.FIXED, label: 'Monto fijo' },
]

export function GoalAccountLinks({ goal, accounts, allLinks, onLink, onUnlink }) {
  const [formMode, setFormMode] = useState(null) // null | 'add' | linkId being edited
  const [accountId, setAccountId] = useState('')
  const [mode, setMode] = useState(ALLOCATION_MODE.ALL)
  const [amount, setAmount] = useState('')

  const links = allLinks.filter((l) => l.goal_id === goal.id)
  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts])
  const honored = useMemo(() => resolveAllocations(allLinks, accountsById), [allLinks, accountsById])

  const editingLink = typeof formMode === 'string' && formMode !== 'add'
    ? links.find((l) => l.id === formMode)
    : null

  const isFixed = mode === ALLOCATION_MODE.FIXED
  const headroom = accountId ? getAccountHeadroom(accountId, allLinks, accountsById, goal.id) : null
  const overAllocated = isFixed && headroom !== null && Number(amount) > headroom && headroom >= 0
  const sharedWithAll = accountId && allLinks.some(
    (l) => l.account_id === accountId && l.goal_id !== goal.id && getLinkMode(l) === ALLOCATION_MODE.ALL
  )

  const availableAccounts = accounts.filter((a) => !links.some((l) => l.account_id === a.id))
  const accountOptions = [
    { value: '', label: 'Selecciona una cuenta' },
    ...availableAccounts.map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ]

  function startAdd() {
    setAccountId('')
    setMode(ALLOCATION_MODE.ALL)
    setAmount('')
    setFormMode('add')
  }

  function startEdit(link) {
    setAccountId(link.account_id)
    setMode(getLinkMode(link))
    setAmount(link.allocated_amount != null ? String(link.allocated_amount) : '')
    setFormMode(link.id)
  }

  const canSave = !!accountId && (!isFixed || Number(amount) > 0)

  let saveLabel = 'Vincular cuenta'
  if (overAllocated) saveLabel = 'Guardar de todas formas'
  else if (editingLink) saveLabel = 'Guardar'

  function handleSave() {
    if (!canSave) return
    onLink(goal.id, accountId, isFixed ? Number(amount) : null, mode)
    setFormMode(null)
  }

  function describeLink(l) {
    const amountHonored = honored[l.id] ?? 0
    if (getLinkMode(l) === ALLOCATION_MODE.ALL) {
      return <>{formatCurrency(amountHonored)} · toda la cuenta</>
    }
    const isShort = amountHonored < Number(l.allocated_amount) - 0.005
    return (
      <>
        {formatCurrency(amountHonored)} de {formatCurrency(l.allocated_amount)} asignado
        {isShort && <span className={styles.shortTag}> · cuenta con menos saldo del asignado</span>}
      </>
    )
  }

  return (
    <div className={styles.wrapper}>
      {links.length > 0 && (
        <div className={styles.list}>
          {links.map((l) => (
            <div key={l.id} className={styles.row}>
              <div className={styles.rowInfo}>
                <span className={styles.accountName}>{accountsById[l.account_id]?.name ?? '—'}</span>
                <span className={styles.rowAmount}>{describeLink(l)}</span>
              </div>
              <button className={styles.editBtn} onClick={() => startEdit(l)}>Editar</button>
              <button className={styles.unlinkBtn} onClick={() => onUnlink(l.id)}>Quitar</button>
            </div>
          ))}
        </div>
      )}

      {formMode ? (
        <div className={styles.addForm}>
          {editingLink ? (
            <p className={styles.editingHint}>
              Editando vínculo con <strong>{accountsById[editingLink.account_id]?.name}</strong>
            </p>
          ) : (
            <Select label="Cuenta" options={accountOptions} value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          )}

          <SegmentedControl
            fullWidth
            size="xs"
            radius="md"
            color="violet"
            value={mode}
            onChange={setMode}
            data={MODE_OPTIONS}
          />

          {isFixed ? (
            <Input label="Monto asignado a este objetivo" type="number" min="0" step="0.01" prefix="S/"
              value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus={!!editingLink} />
          ) : (
            <p className={styles.headroomHint}>
              Todo el saldo de la cuenta cuenta para este objetivo (menos lo que otros objetivos
              tengan como monto fijo). Cada vez que le metas dinero, el objetivo avanza solo.
            </p>
          )}

          {headroom !== null && (
            <p className={styles.headroomHint}>
              Disponible sin comprometer en esta cuenta: {formatCurrency(Math.max(headroom, 0))}
            </p>
          )}
          {sharedWithAll && (
            <p className={styles.warning}>
              <IconAlertTriangle size={14} stroke={1.75} className={styles.warningIcon} />
              Otro objetivo usa esta cuenta completa; el saldo libre se reparte entre ellos.
            </p>
          )}
          {overAllocated && (
            <p className={styles.warning}>
              <IconAlertTriangle size={14} stroke={1.75} className={styles.warningIcon} />
              Asignas más de lo disponible en esa cuenta ahora mismo.
            </p>
          )}
          <div className={styles.addActions}>
            <Button size="sm" variant="secondary" onClick={() => setFormMode(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {saveLabel}
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
