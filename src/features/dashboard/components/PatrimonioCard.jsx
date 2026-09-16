import { Link } from 'react-router-dom'
import { formatCurrency } from '@/lib/formatters'
import { Card } from '@/components/ui/Card/Card'
import {
  IconBuildingBank, IconArrowRight, IconTrendingDown, IconTrendingUp,
  IconWallet, IconCoin, IconCoinOff,
} from '@tabler/icons-react'
import styles from './PatrimonioCard.module.css'

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`
}

function Row({ icon: RowIcon, label, sublabel, amount, tone }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        <div className={styles.rowIcon}><RowIcon size={20} stroke={1.75} /></div>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowSublabel}>{sublabel}</span>
        </div>
      </div>
      <span className={`${styles.rowAmount} ${tone ? styles[tone] : ''}`}>{amount}</span>
    </div>
  )
}

export function PatrimonioCard({
  availableMoney, receivable, payable, netWorth,
  accountsCount, receivableCount, payableCount,
}) {
  const netWorthNegative = netWorth < 0

  return (
    <Card>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}><IconBuildingBank size={20} stroke={1.75} /></div>
          <div>
            <h3 className={styles.title}>Patrimonio</h3>
            <span className={styles.subtitle}>Consolidado general</span>
          </div>
        </div>
        <Link to="/prestamos" className={styles.link}>
          Ver préstamos <IconArrowRight size={15} stroke={1.75} />
        </Link>
      </div>

      <div className={styles.netWorthBox}>
        <div>
          <span className={styles.netWorthLabel}>Patrimonio neto total</span>
          <div
            className={styles.netWorthAmount}
            style={netWorthNegative ? { color: 'var(--color-danger-soft)' } : undefined}
          >
            {formatCurrency(netWorth)}
          </div>
        </div>
        <div className={`${styles.netWorthIcon} ${netWorthNegative ? styles.down : styles.up}`}>
          {netWorthNegative ? <IconTrendingDown size={22} stroke={1.75} /> : <IconTrendingUp size={22} stroke={1.75} />}
        </div>
      </div>

      <div className={styles.rows}>
        <Row
          icon={IconWallet}
          label="Dinero disponible"
          sublabel={pluralize(accountsCount, 'cuenta', 'cuentas')}
          amount={formatCurrency(availableMoney)}
        />
        <Row
          icon={IconCoin}
          label="Por cobrar"
          sublabel={receivableCount === 0 ? 'Sin préstamos activos' : pluralize(receivableCount, 'préstamo pendiente', 'préstamos pendientes')}
          amount={receivable > 0 ? `+${formatCurrency(receivable)}` : formatCurrency(receivable)}
          tone={receivable > 0 ? 'success' : undefined}
        />
        <Row
          icon={IconCoinOff}
          label="Deudas"
          sublabel={payableCount === 0 ? 'Al día • Sin compromisos' : pluralize(payableCount, 'préstamo por pagar', 'préstamos por pagar')}
          amount={formatCurrency(payable)}
          tone={payable > 0 ? 'danger' : undefined}
        />
      </div>
    </Card>
  )
}
