import { Link } from 'react-router-dom'
import { IconChevronRight } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import styles from './BalanceHero.module.css'

// La cifra protagonista: cuánto dinero tienes hoy en tus cuentas. Debajo, el
// desglose paso a paso de lo que cambia ese número:
//   saldo + te deben           = si te pagaran todo
//   (si te pagaran todo) − debes = patrimonio neto (todo saldado)
// pendingRepay: lo que falta reponer a tus cuentas. Ya está descontado del
// saldo y reponerlo solo mueve dinero entre tus cuentas, así que no cambia los
// totales: se muestra aparte, con lo que te queda libre sin tocarlo.
export function BalanceHero({ availableMoney, receivable, payable, netWorth, accountsCount, pendingRepay = 0 }) {
  const ifPaid = availableMoney + receivable
  const hasLoans = receivable > 0 || payable > 0
  const free = availableMoney - pendingRepay

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
      <p className={styles.sub}>Lo que hay hoy en tus cuentas</p>

      {(hasLoans || pendingRepay > 0) ? (
        <div className={styles.ledger}>
          {hasLoans && (
            <dl className={styles.group}>
              <div className={styles.row}>
                <dt>
                  <Link to="/prestamos" className={styles.rowLink}>Te deben</Link>
                </dt>
                <dd><Money value={receivable} tone={receivable > 0 ? 'income' : 'neutral'} signed={receivable > 0} /></dd>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <dt>
                  Si te pagaran todo
                  <span className={styles.hint}>Saldo + lo que te deben</span>
                </dt>
                <dd><Money value={ifPaid} tone={ifPaid < 0 ? 'expense' : 'neutral'} /></dd>
              </div>
              {payable > 0 && (
                <>
                  <div className={styles.row}>
                    <dt>
                      <Link to="/prestamos" className={styles.rowLink}>Debes</Link>
                    </dt>
                    <dd><Money value={payable} tone="expense" signed /></dd>
                  </div>
                  <div className={`${styles.row} ${styles.total}`}>
                    <dt>
                      Patrimonio neto
                      <span className={styles.hint}>Si cobraras y pagaras todo</span>
                    </dt>
                    <dd><Money value={netWorth} tone={netWorth < 0 ? 'expense' : 'neutral'} /></dd>
                  </div>
                </>
              )}
            </dl>
          )}

          {pendingRepay > 0 && (
            <dl className={styles.group}>
              <div className={styles.row}>
                <dt>
                  <Link to="/cuentas" className={styles.rowLink}>Por reponer a tus cuentas</Link>
                  <span className={styles.hint}>Ya salió del saldo; reponerlo no cambia el total</span>
                </dt>
                <dd><Money value={pendingRepay} tone="warning" /></dd>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <dt>
                  Libre sin tocar lo por reponer
                  <span className={styles.hint}>Saldo − por reponer</span>
                </dt>
                <dd><Money value={free} tone={free < 0 ? 'expense' : 'neutral'} /></dd>
              </div>
            </dl>
          )}
        </div>
      ) : (
        <p className={styles.caption}>Sin préstamos ni montos por reponer</p>
      )}
    </section>
  )
}
