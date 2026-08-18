import { Card } from '@/components/ui/Card/Card'
import { formatCurrency } from '@/lib/formatters'
import styles from './RecurringExpensesCard.module.css'

export function RecurringExpensesCard({ recurring }) {
  const { fixedExpenses, recurringIncomes, totalFixedExpense, totalRecurringIncome, pctOfExpense } = recurring

  return (
    <Card className={styles.mb}>
      <Card.Header>
        <Card.Title subtitle={`Gasto fijo = ${pctOfExpense}% de tu gasto total este mes`}>
          Gastos recurrentes
        </Card.Title>
      </Card.Header>

      <div className={styles.columns}>
        <div>
          <div className={styles.colHeader}>
            <span>Gastos fijos</span>
            <span className={styles.total}>{formatCurrency(totalFixedExpense)}</span>
          </div>
          {fixedExpenses.length === 0 ? (
            <div className={styles.empty}>Sin gastos fijos registrados este mes</div>
          ) : (
            <div className={styles.list}>
              {fixedExpenses.map((e) => (
                <div key={e.id} className={styles.row}>
                  <span className={styles.rowName}>{e.category?.name ?? e.description ?? 'Gasto fijo'}</span>
                  <span className={styles.rowAmount}>{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className={styles.colHeader}>
            <span>Ingresos recurrentes</span>
            <span className={styles.total}>{formatCurrency(totalRecurringIncome)}</span>
          </div>
          {recurringIncomes.length === 0 ? (
            <div className={styles.empty}>Sin ingresos recurrentes registrados este mes</div>
          ) : (
            <div className={styles.list}>
              {recurringIncomes.map((i) => (
                <div key={i.id} className={styles.row}>
                  <span className={styles.rowName}>{i.category?.name ?? i.description ?? 'Ingreso recurrente'}</span>
                  <span className={styles.rowAmount}>{formatCurrency(i.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
