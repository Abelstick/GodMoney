import { Select } from '@/components/ui/Select/Select'
import { formatCurrency } from '@/lib/formatters'
import styles from './PaidFromField.module.css'

/**
 * "¿De dónde salió el dinero?" para un gasto.
 * - Sin cuenta: el gasto solo se registra (ningún saldo cambia).
 * - Con cuenta: se descuenta de su saldo.
 * - Con cuenta de ahorro: además se ofrece "Lo voy a reponer" (deuda con el ahorro).
 */
export function PaidFromField({ accounts, value, onChange, repay, onRepayChange, amount }) {
  const options = [
    { value: '', label: 'No indicar (solo registrar el gasto)' },
    ...accounts
      .filter((a) => !a.is_archived || a.id === value)
      .map((a) => ({
        value: a.id,
        label: `${a.name}${a.is_savings ? ' · ahorro' : ''} (${formatCurrency(a.balance)})`,
      })),
  ]
  const account = accounts.find((a) => a.id === value)
  const fromSavings = Boolean(account?.is_savings)
  const value$ = Number(amount) > 0 ? formatCurrency(Number(amount)) : 'el monto'

  let hint = 'El gasto cuenta en tu mes, pero no cambia el saldo de ninguna cuenta.'
  if (account && !fromSavings) hint = `Se descontará ${value$} del saldo de ${account.name}.`

  return (
    <div className={fromSavings ? styles.savingsBox : styles.box}>
      <Select label="Pagado desde" options={options} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      {fromSavings ? (
        <>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={repay} onChange={(e) => onRepayChange(e.target.checked)} />
            Lo voy a reponer a mi ahorro
          </label>
          <p className={styles.hint}>
            {repay
              ? `Se descontará ${value$} de ${account.name} y se sumará a lo que le debes a tu ahorro. Podrás reponerlo por partes desde Cuentas.`
              : `Se descontará ${value$} de ${account.name}, sin dejarlo como deuda.`}
          </p>
        </>
      ) : (
        <p className={styles.hint}>{hint}</p>
      )}
    </div>
  )
}
