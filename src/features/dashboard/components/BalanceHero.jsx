import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronDown, IconChevronRight, IconEye, IconEyeOff } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import { usePersistentState } from '@/hooks/usePersistentState'
import { accountKind } from '@/lib/moneyType'
import styles from './BalanceHero.module.css'

// La cifra protagonista: cuánto dinero tienes hoy en tus cuentas. Debajo, el
// desglose paso a paso de lo que falta que vuelva a ellas:
//   te deben + por reponer            = por recuperar
//   saldo + por recuperar             = si te pagaran y repusieras todo
//   (lo anterior) − debes             = patrimonio neto
// receivable/payable: préstamos. pendingRepay: lo que falta reponer a tus
// cuentas (gastos y retiros marcados «Lo voy a reponer»).
// accounts: las cuentas que suman el saldo, para el desglose «Ver por cuenta».
//
// Privacidad: los montos arrancan ocultos en cada visita y se muestran con el
// ojo. No se recuerda a propósito, para que nunca queden a la vista sin querer.
export function BalanceHero({ availableMoney, receivable, payable, accountsCount, pendingRepay = 0, accounts = [] }) {
  const [visible, setVisible] = useState(false)
  const [byAccount, setByAccount] = usePersistentState(
    'godmoney:balance-by-account', false, (v) => typeof v === 'boolean',
  )

  const toRecover = receivable + pendingRepay
  const ifSettled = availableMoney + toRecover
  const netWorth = ifSettled - payable
  const hasDetail = toRecover > 0 || payable > 0
  const sorted = [...accounts].sort((a, b) => Number(b.balance) - Number(a.balance))

  // Monto del panel: oculto hasta que se active el ojo.
  const Amount = (props) => (visible
    ? <Money {...props} />
    : (
      <span className={`${styles.masked} ${props.size === 'xl' ? styles.maskedXl : ''}`}>
        <span aria-hidden="true">S/ ••••</span>
        <span className={styles.srOnly}>Monto oculto</span>
      </span>
    ))

  return (
    <section className={styles.hero} aria-labelledby="balance-label">
      <div className={styles.top}>
        <div className={styles.heading}>
          <h2 id="balance-label" className={styles.label}>Saldo total</h2>
          <button
            type="button"
            className={styles.eye}
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? 'Ocultar montos' : 'Mostrar montos'}
            title={visible ? 'Ocultar montos' : 'Mostrar montos'}
          >
            {visible
              ? <IconEye size={18} stroke={1.75} aria-hidden="true" />
              : <IconEyeOff size={18} stroke={1.75} aria-hidden="true" />}
          </button>
        </div>
        <Link to="/cuentas" className={styles.link}>
          {accountsCount} {accountsCount === 1 ? 'cuenta' : 'cuentas'}
          <IconChevronRight size={14} stroke={2} aria-hidden="true" />
        </Link>
      </div>

      <Amount value={availableMoney} tone={availableMoney < 0 ? 'expense' : 'neutral'} size="xl" />
      <p className={styles.sub}>Lo que hay hoy en tus cuentas</p>

      {sorted.length > 0 && (
        <div className={styles.accounts}>
          <button
            type="button"
            className={styles.accountsToggle}
            onClick={() => setByAccount((v) => !v)}
            aria-expanded={byAccount}
            aria-controls="balance-by-account"
          >
            {byAccount ? 'Ocultar desglose' : 'Ver por cuenta'}
            <IconChevronDown
              size={14} stroke={2} aria-hidden="true"
              className={`${styles.chevron} ${byAccount ? styles.chevronOpen : ''}`}
            />
          </button>
          {byAccount && (
            <dl id="balance-by-account" className={styles.group}>
              {sorted.map((a) => {
                const kind = a.is_savings ? 'Ahorro' : accountKind(a) === 'CASH' ? 'Efectivo' : null
                return (
                  <div key={a.id} className={styles.row}>
                    <dt>
                      <Link to={`/cuentas/${a.id}`} className={styles.account}>
                        <span className={styles.dot} style={{ background: a.color || 'currentColor' }} aria-hidden="true" />
                        <span className={styles.accountName}>{a.name}</span>
                      </Link>
                      {kind && <span className={`${styles.hint} ${styles.accountKind}`}>{kind}</span>}
                    </dt>
                    <dd><Amount value={Number(a.balance)} tone={Number(a.balance) < 0 ? 'expense' : 'neutral'} /></dd>
                  </div>
                )
              })}
              {sorted.length > 1 && (
                <div className={`${styles.row} ${styles.total}`}>
                  <dt>Saldo total</dt>
                  <dd><Amount value={availableMoney} tone={availableMoney < 0 ? 'expense' : 'neutral'} /></dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      {hasDetail ? (
        <div className={styles.ledger}>
          {toRecover > 0 && (
            <dl className={styles.group}>
              {receivable > 0 && (
                <div className={styles.row}>
                  <dt><Link to="/prestamos" className={styles.rowLink}>Te deben</Link></dt>
                  <dd><Amount value={receivable} tone="income" signed /></dd>
                </div>
              )}
              {pendingRepay > 0 && (
                <div className={styles.row}>
                  <dt><Link to="/cuentas" className={styles.rowLink}>Por reponer a tus cuentas</Link></dt>
                  <dd><Amount value={pendingRepay} tone="income" signed /></dd>
                </div>
              )}
              {receivable > 0 && pendingRepay > 0 && (
                <div className={`${styles.row} ${styles.total}`}>
                  <dt>
                    Por recuperar
                    <span className={styles.hint}>Te deben + por reponer</span>
                  </dt>
                  <dd><Amount value={toRecover} /></dd>
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
                <dd><Amount value={ifSettled} tone={ifSettled < 0 ? 'expense' : 'neutral'} /></dd>
              </div>
            )}
            {payable > 0 && (
              <>
                <div className={styles.row}>
                  <dt><Link to="/prestamos" className={styles.rowLink}>Debes</Link></dt>
                  <dd><Amount value={payable} tone="expense" signed /></dd>
                </div>
                <div className={`${styles.row} ${styles.total}`}>
                  <dt>
                    Patrimonio neto
                    <span className={styles.hint}>
                      {toRecover > 0 ? 'Si además pagaras lo que debes' : 'Saldo − lo que debes'}
                    </span>
                  </dt>
                  <dd><Amount value={netWorth} tone={netWorth < 0 ? 'expense' : 'neutral'} /></dd>
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
