import { SegmentedControl } from '@mantine/core'
import { Select } from '@/components/ui/Select/Select'
import { formatCurrency } from '@/lib/formatters'
import { MONEY_TYPES, accountKind } from '@/lib/moneyType'
import styles from './ReceivedInField.module.css'

/**
 * Cómo llegó un ingreso: dinero bancario o en efectivo, y en qué cuenta entró.
 * - El tipo filtra las cuentas (bancarias o de efectivo).
 * - Sin cuenta: el ingreso solo se registra (ningún saldo cambia).
 * - Con cuenta: se suma a su saldo.
 */
export function ReceivedInField({ accounts, moneyType, onMoneyTypeChange, value, onChange, amount }) {
  const matching = accounts.filter((a) => accountKind(a) === moneyType && (!a.is_archived || a.id === value))
  const isCash = moneyType === 'CASH'
  const options = [
    { value: '', label: 'No indicar (solo registrar el ingreso)' },
    ...matching.map((a) => ({
      value: a.id,
      label: `${a.name}${a.is_savings ? ' · ahorro' : ''} (${formatCurrency(a.balance)})`,
    })),
  ]
  const account = matching.find((a) => a.id === value)
  const value$ = Number(amount) > 0 ? formatCurrency(Number(amount)) : 'el monto'

  // Al cambiar de tipo, la cuenta elegida deja de servir: si hay una sola
  // cuenta de ese tipo se propone, si no se deja sin indicar.
  function handleTypeChange(next) {
    onMoneyTypeChange(next)
    const candidates = accounts.filter((a) => accountKind(a) === next && !a.is_archived)
    onChange(candidates.length === 1 ? candidates[0].id : '')
  }

  let hint
  if (account) hint = `Se sumará ${value$} al saldo de ${account.name}.`
  else if (matching.length === 0) hint = isCash
    ? 'No tienes cuentas de efectivo. Crea una en Cuentas (tipo Efectivo) para llevar su saldo.'
    : 'No tienes cuentas bancarias. Crea una en Cuentas para llevar su saldo.'
  else hint = 'El ingreso cuenta en tu mes, pero no cambia el saldo de ninguna cuenta.'

  return (
    <div className={styles.box}>
      <span className={styles.label} id="received-type-label">¿Cómo lo recibiste?</span>
      <SegmentedControl
        fullWidth
        aria-labelledby="received-type-label"
        data={MONEY_TYPES}
        value={moneyType}
        onChange={handleTypeChange}
      />
      {matching.length > 0 && (
        <Select
          label={isCash ? 'Guardado en' : 'Recibido en'}
          options={options}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <p className={styles.hint}>{hint}</p>
    </div>
  )
}
