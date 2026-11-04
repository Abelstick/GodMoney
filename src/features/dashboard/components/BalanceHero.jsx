import { Link } from 'react-router-dom'
import { IconChevronRight } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import styles from './BalanceHero.module.css'

// La cifra protagonista: cuánto dinero tienes hoy en tus cuentas. Debajo, el
// desglose paso a paso de lo que falta que vuelva a ellas:
//   te deben + por reponer            = por recuperar
//   saldo + por recuperar             = si te pagaran y repusieras todo
//   (lo anterior) − debes             = patrimonio neto
// receivable/payable: préstamos. pendingRepay: lo que falta reponer a tus
// cuentas (gastos y retiros marcados «Lo voy a reponer»).
export function BalanceHero({ availableMoney, receivable, payable, accountsCount, pendingRepay = 0 }) {
  const toRecover = receivable + pendingRepay
  const ifSettled = availableMoney + toRecover
  const netWorth = ifSettled - payable
  const hasDetail = toRecover > 0 || payable > 0

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

      {hasDetail ? (
        <div className={styles.ledger}>
          {toRecover > 0 && (
            <dl className={styles.group}>
              {receivable > 0 && (
                <div className={styles.row}>
                  <dt><Link to="/prestamos" className={styles.rowLink}>Te deben</Link></dt>
                  <dd><Money value={receivable} tone="income" signed /></dd>
                </div>
              )}
              {pendingRepay > 0 && (
                <div className={styles.row}>
                  <dt><Link to="/cuentas" className={styles.rowLink}>Por reponer a tus cuentas</Link></dt>
                  <dd><Money value={pendingRepay} tone="income" signed /></dd>
                </div>
              )}
              {receivable > 0 && pendingRepay > 0 && (
                <div className={`${styles.row} ${styles.total}`}>
                  <dt>
                    Por recuperar
                    <span className={styles.hint}>Te deben + por reponer</span>
                  </dt>
                  <dd><Money value={toRecover} /></dd>
                </div>
              )}
            </dl>
          )}

          <dl className={styles.group}>
            {toRecover > 0 && (
              <div className={`${styles.row} ${styles.total}`}>
                <dt>
                  {pendingRepay > 0 && receivable > 0 ? 'Si te pagaran y repusieras todo'
                    : pendingRepay > 0 ? 'Si repusieras todo' : 'Si te pagaran todo'}
                  <span className={styles.hint}>
                    Saldo{receivable > 0 ? ' + te deben' : ''}{pendingRepay > 0 ? ' + por reponer' : ''}
                  </span>
                </dt>
                <dd><Money value={ifSettled} tone={ifSettled < 0 ? 'expense' : 'neutral'} /></dd>
              </div>
            )}
            {payable > 0 && (
              <>
                <div className={styles.row}>
                  <dt><Link to="/prestamos" className={styles.rowLink}>Debes</Link></dt>
                  <dd><Money value={payable} tone="expense" signed /></dd>
                </div>
                <div className={`${styles.row} ${styles.total}`}>
                  <dt>
                    Patrimonio neto
                    <span className={styles.hint}>
                      {toRecover > 0 ? 'Si además pagaras lo que debes' : 'Saldo − lo que debes'}
                    </span>
                  </dt>
                  <dd><Money value={netWorth} tone={netWorth < 0 ? 'expense' : 'neutral'} /></dd>
                </div>
              </>
            )}
          </dl>
        </div>
      ) : (
        <p className={styles.caption}>Sin préstamos ni montos por reponer</p>
      )}
    </section>
  )
}
