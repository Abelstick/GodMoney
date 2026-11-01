import { Link } from 'react-router-dom'
import { IconChevronRight } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import styles from './BalanceHero.module.css'

// La cifra protagonista: cuánto dinero tienes hoy en tus cuentas. Debajo, lo
// que cambia ese número (lo que te deben y lo que debes) y el patrimonio neto.
export function BalanceHero({ availableMoney, receivable, payable, netWorth, accountsCount }) {
  const hasLoans = receivable > 0 || payable > 0

  return (
    <section className={styles.hero} aria-labelledby="balance-label">
      <div className={styles.top}>
        <h2 id="balance-label" className={styles.label}>Saldo total</h2>
        <Link to="/cuentas" className={styles.link}>
          {accountsCount} {accountsCount === 1 ? 'cuenta' : 'cuentas'}
          <IconChevronRight size={14} stroke={2} aria-hidden="true" />
        </Link>
      </div>

      <Money value={availableMoney} tone={availableMoney < 0 ? 'expense' : 'neutral'} size="xl" />

      {hasLoans ? (
        <dl className={styles.details}>
          <div className={styles.detail}>
            <dt>Te deben</dt>
            <dd><Money value={receivable} tone="income" /></dd>
          </div>
          <div className={styles.detail}>
            <dt>Debes</dt>
            <dd><Money value={payable} tone={payable > 0 ? 'expense' : 'neutral'} /></dd>
          </div>
          <div className={styles.detail}>
            <dt>Patrimonio neto</dt>
            <dd><Money value={netWorth} tone={netWorth < 0 ? 'expense' : 'neutral'} /></dd>
          </div>
        </dl>
      ) : (
        <p className={styles.caption}>Suma de tus cuentas activas</p>
      )}
    </section>
  )
}
