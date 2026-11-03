import { Money } from '@/components/ui/Money/Money'
import { formatSignedCurrency } from '@/lib/formatters'
import { fromCents } from '@/lib/simulation/money'
import { bucketBreakdown } from '@/lib/simulation/metrics'
import styles from './Results.module.css'

// Saldo por cuenta al final del periodo (solo si el escenario usa cuentas).
export function AccountBreakdown({ result, accounts }) {
  const rows = bucketBreakdown(result, accounts)
  if (rows.length < 2) return null
  return (
    <table className={styles.breakdown}>
      <caption className={styles.breakdownCaption}>Saldo por cuenta</caption>
      <thead>
        <tr><th scope="col">Cuenta</th><th scope="col">Inicio</th><th scope="col">Final</th><th scope="col">Cambio</th></tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} data-negative={row.final < 0 || undefined}>
            <th scope="row">{row.name}</th>
            <td><Money value={fromCents(row.initial)} /></td>
            <td><Money value={fromCents(row.final)} tone={row.final < 0 ? 'expense' : 'neutral'} /></td>
            <td className={styles.breakdownDelta}>{formatSignedCurrency(fromCents(row.final - row.initial))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
