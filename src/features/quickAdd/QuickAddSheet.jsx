import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Drawer, Modal, SegmentedControl, NumberInput, Chip, Select, TextInput, Button, Anchor,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { format, subDays } from 'date-fns'
import { useStore } from '@/store'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { usePersistentState } from '@/hooks/usePersistentState'
import { getRecentCategoryIds, rememberCategory } from '@/lib/recentCategories'
import { formatCurrency } from '@/lib/formatters'
import { accountKind } from '@/lib/moneyType'
import { PaidFromField } from '@/components/common/PaidFromField/PaidFromField'
import { ReceivedInField } from '@/components/common/ReceivedInField/ReceivedInField'
import { EMPTY_EXTRAS, extrasPayload } from '@/components/common/TransactionExtras/TransactionExtras'
import styles from './QuickAddSheet.module.css'

const TYPES = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income',  label: 'Ingreso' },
]

const isIdList = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string')

const today     = () => format(new Date(), 'yyyy-MM-dd')
const yesterday = () => format(subDays(new Date(), 1), 'yyyy-MM-dd')

// Registro en ≤ 3 toques: + → monto → (chip de categoría) → Guardar.
// La última categoría usada viene preseleccionada; la fecha por defecto es hoy.
function QuickAddForm({ onDone }) {
  const navigate    = useNavigate()
  const addExpense  = useStore((s) => s.addExpense)
  const addIncome   = useStore((s) => s.addIncome)
  const showToast   = useStore((s) => s.showToast)
  const expenses    = useStore((s) => s.expenses)
  const incomes     = useStore((s) => s.incomes)

  const [type, setType] = usePersistentState('gm.quickadd.type', 'expense', (v) => v === 'expense' || v === 'income')
  const [lastExpenseCats, setLastExpenseCats] = usePersistentState('gm.quickadd.recent.expense', [], isIdList)
  const [lastIncomeCats,  setLastIncomeCats]  = usePersistentState('gm.quickadd.recent.income', [], isIdList)
  const [savingsAccountId, setSavingsAccountId] = usePersistentState('gm.quickadd.savingsAccount', '', (v) => typeof v === 'string')
  // La cuenta donde suelen entrar los ingresos se recuerda entre registros.
  const [incomeAccountId, setIncomeAccountId] = usePersistentState('gm.quickadd.incomeAccount', '', (v) => typeof v === 'string')
  const [moneyType, setMoneyType] = usePersistentState('gm.quickadd.moneyType', 'BANK', (v) => v === 'BANK' || v === 'CASH')

  const { categories: expenseCategories } = useCategories('expense')
  const { categories: incomeCategories }  = useCategories('income')
  const { accounts } = useAccounts()

  const isExpense  = type === 'expense'
  const receivedIn = accounts.some((a) => a.id === incomeAccountId && !a.is_archived && accountKind(a) === moneyType) ? incomeAccountId : ''
  const categories = isExpense ? expenseCategories : incomeCategories
  const lastUsed   = isExpense ? lastExpenseCats : lastIncomeCats

  const recentIds = useMemo(() => getRecentCategoryIds({
    lastUsed,
    transactions: isExpense ? expenses : incomes,
    categories,
  }), [lastUsed, isExpense, expenses, incomes, categories])

  const [amount, setAmount]           = useState('')
  // undefined = todavía no eligió: se usa la última categoría usada
  const [pickedCategory, setPickedCategory] = useState(undefined)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [description, setDescription] = useState('')
  const [dateMode, setDateMode]       = useState('today')
  const [customDate, setCustomDate]   = useState(today())
  const [paidFrom, setPaidFrom]       = useState('')
  const [repay, setRepay]             = useState(true)
  const [error, setError]             = useState(null)
  const [saving, setSaving]           = useState(false)

  const defaultCategory = lastUsed.find((id) => categories.some((c) => c.id === id)) ?? null
  const categoryId = pickedCategory === undefined ? defaultCategory : pickedCategory
  const category   = categories.find((c) => c.id === categoryId)
  const isSavings  = isExpense && Boolean(category?.is_savings)

  // Si la categoría elegida no está entre los chips, se muestra igual al frente.
  const chipIds = categoryId && !recentIds.includes(categoryId)
    ? [categoryId, ...recentIds.slice(0, -1)]
    : recentIds
  const chipCategories = chipIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean)

  const date = dateMode === 'today' ? today() : dateMode === 'yesterday' ? yesterday() : customDate
  const numericAmount = Number(amount)
  const validAmount = numericAmount > 0

  function changeType(next) {
    setType(next)
    setPickedCategory(undefined)
    setShowAllCategories(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validAmount) { setError('Ingresa un monto mayor a cero'); return }
    if (!date) { setError('Elige una fecha'); return }

    setSaving(true)
    try {
      const base = {
        amount:      numericAmount,
        description: description.trim() || null,
        category_id: categoryId || null,
        date,
        ...extrasPayload(EMPTY_EXTRAS),
      }
      if (isExpense) {
        await addExpense({
          ...base,
          is_fixed: false,
          savings_account_id: isSavings ? (savingsAccountId || null) : null,
          paid_from_account_id: paidFrom || null,
          repay_to_savings: repay,
        })
        setLastExpenseCats((prev) => rememberCategory(prev, categoryId))
      } else {
        await addIncome({ ...base, is_recurring: false, money_type: moneyType, account_id: receivedIn || null })
        setLastIncomeCats((prev) => rememberCategory(prev, categoryId))
      }
      onDone()
    } catch (err) {
      showToast(err.message ?? 'No se pudo guardar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function openFullForm() {
    onDone()
    navigate(isExpense ? '/gastos?nuevo=1' : '/ingresos?nuevo=1')
  }

  const accountOptions = [
    { value: '', label: 'Ninguna (solo registrar el gasto)' },
    ...accounts
      .filter((a) => !a.is_archived)
      .map((a) => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` })),
  ]

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <SegmentedControl
        fullWidth
        value={type}
        onChange={changeType}
        data={TYPES}
        color={isExpense ? 'expense' : 'income'}
        aria-label="Tipo de movimiento"
      />

      <NumberInput
        data-autofocus
        aria-label="Monto"
        placeholder="0.00"
        value={amount}
        onChange={(v) => { setAmount(v); setError(null) }}
        allowNegative={false}
        min={0}
        leftSection={<span className={styles.currency}>S/</span>}
        leftSectionWidth={56}
        classNames={{ input: `${styles.amount} ${isExpense ? styles.amountExpense : styles.amountIncome}` }}
        error={error}
        size="xl"
      />

      <div className={styles.field}>
        <span className={styles.label} id="qa-category-label">Categoría</span>
        {showAllCategories ? (
          <>
            <Select
              autoFocus
              aria-labelledby="qa-category-label"
              data={categories.map((c) => ({ value: c.id, label: c.name }))}
              value={categoryId}
              onChange={(v) => { setPickedCategory(v); setShowAllCategories(false) }}
              searchable
              clearable
              placeholder="Buscar categoría"
              nothingFoundMessage="No hay categorías con ese nombre"
              defaultDropdownOpened
              comboboxProps={{ withinPortal: false }}
            />
            <Anchor component="button" type="button" size="sm" onClick={() => setShowAllCategories(false)} className={styles.back}>
              Volver a las sugeridas
            </Anchor>
          </>
        ) : (
          <Chip.Group value={categoryId ?? ''} onChange={(v) => setPickedCategory(v === categoryId ? null : v)}>
            <div className={styles.chips} role="radiogroup" aria-labelledby="qa-category-label">
              {chipCategories.map((c) => (
                <Chip
                  key={c.id}
                  value={c.id}
                  variant="light"
                  radius="sm"
                  classNames={{ label: `${styles.chip} ${styles.categoryChip}` }}
                  style={{ '--chip-dot': c.color ?? 'var(--color-text-muted)' }}
                >
                  {c.name}
                </Chip>
              ))}
              {categories.length > chipCategories.length && (
                <button type="button" className={styles.moreChip} onClick={() => setShowAllCategories(true)}>
                  Otra…
                </button>
              )}
            </div>
          </Chip.Group>
        )}
      </div>

      {isSavings && (
        <Select
          label="¿A qué cuenta va este ahorro?"
          data={accountOptions}
          value={savingsAccountId}
          onChange={(v) => setSavingsAccountId(v ?? '')}
          allowDeselect={false}
          description={savingsAccountId
            ? 'Se sumará al saldo de la cuenta y a los objetivos vinculados.'
            : 'Sin cuenta, solo cuenta como salida del mes.'}
        />
      )}

      {isExpense && accounts.length > 0 && (
        <PaidFromField
          accounts={accounts}
          value={paidFrom}
          onChange={setPaidFrom}
          repay={repay}
          onRepayChange={setRepay}
          amount={numericAmount}
        />
      )}

      {!isExpense && (
        <ReceivedInField
          accounts={accounts}
          moneyType={moneyType}
          onMoneyTypeChange={setMoneyType}
          value={receivedIn}
          onChange={setIncomeAccountId}
          amount={numericAmount}
        />
      )}

      <div className={styles.field}>
        <span className={styles.label} id="qa-date-label">Fecha</span>
        <Chip.Group value={dateMode} onChange={setDateMode}>
          <div className={styles.chips} role="radiogroup" aria-labelledby="qa-date-label">
            <Chip value="today" variant="light" radius="sm" classNames={{ label: styles.chip }}>Hoy</Chip>
            <Chip value="yesterday" variant="light" radius="sm" classNames={{ label: styles.chip }}>Ayer</Chip>
            <Chip value="custom" variant="light" radius="sm" classNames={{ label: styles.chip }}>Otra fecha</Chip>
          </div>
        </Chip.Group>
        {dateMode === 'custom' && (
          <TextInput
            type="date"
            aria-label="Fecha del movimiento"
            value={customDate}
            onChange={(e) => setCustomDate(e.currentTarget.value)}
            max={today()}
          />
        )}
      </div>

      <TextInput
        aria-label="Descripción (opcional)"
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        maxLength={200}
      />

      <Button
        type="submit"
        size="lg"
        fullWidth
        color={isExpense ? 'expense' : 'income'}
        loading={saving}
        disabled={!validAmount}
      >
        {validAmount
          ? `Guardar ${isExpense ? 'gasto' : 'ingreso'} de ${formatCurrency(numericAmount)}`
          : `Guardar ${isExpense ? 'gasto' : 'ingreso'}`}
      </Button>

      <Anchor component="button" type="button" size="sm" onClick={openFullForm} className={styles.fullForm}>
        Agregar notas, etiquetas o adjuntos
      </Anchor>
    </form>
  )
}

export function QuickAddSheet({ opened, onClose }) {
  const isDesktop = useMediaQuery('(min-width: 768px)', false, { getInitialValueInEffect: false })
  const title = 'Registrar movimiento'

  if (isDesktop) {
    return (
      <Modal opened={opened} onClose={onClose} title={title} size="md">
        <QuickAddForm onDone={onClose} />
      </Modal>
    )
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="auto"
      title={title}
      classNames={{ content: styles.drawer, body: styles.drawerBody }}
    >
      <QuickAddForm onDone={onClose} />
    </Drawer>
  )
}
