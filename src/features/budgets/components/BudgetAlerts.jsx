import { IconBellRinging } from '@tabler/icons-react'
import { BUDGET_STATUS } from '@/lib/budgetStatus'
import styles from './BudgetAlerts.module.css'

// Una sola línea: el detalle está en las tarjetas, ya ordenadas por urgencia.
export function BudgetAlerts({ budgets }) {
  const count = (status) => budgets.filter((b) => b.status === status).length
  const exceeded = count(BUDGET_STATUS.EXCEEDED)
  const reached = count(BUDGET_STATUS.REACHED)
  const near = count(BUDGET_STATUS.WARNING)
  const atRisk = budgets.filter((b) => b.status === BUDGET_STATUS.NORMAL && b.pace?.projectedOver).length

  const parts = [
    exceeded > 0 && `${exceeded} ${exceeded === 1 ? 'excedido' : 'excedidos'}`,
    reached > 0 && `${reached} al límite`,
    near > 0 && `${near} cerca del límite`,
    atRisk > 0 && `${atRisk} ${atRisk === 1 ? 'podría pasarse' : 'podrían pasarse'}`,
  ].filter(Boolean)

  if (!parts.length) return null

  return (
    <p className={`${styles.line} ${exceeded > 0 ? styles.danger : ''}`}>
      <IconBellRinging size={16} stroke={1.75} aria-hidden="true" className={styles.icon} />
      {parts.join(' · ')}
    </p>
  )
}
