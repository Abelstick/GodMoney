import { useInsights } from '@/hooks/useInsights'
import { LoadingSpinner } from '@/components/common/LoadingSpinner/LoadingSpinner'
import { MonthEndProjectionCard } from './components/MonthEndProjectionCard'
import { DailyAvailableCard }     from './components/DailyAvailableCard'
import { SmartAlertsPanel }       from './components/SmartAlertsPanel'
import { RecurringExpensesCard }  from './components/RecurringExpensesCard'
import { AutoInsightsList }       from './components/AutoInsightsList'
import styles from './Insights.module.css'

export function Insights() {
  const { loading, projection, dailyAvailable, alerts, recurring, autoInsights } = useInsights()

  if (loading) return <LoadingSpinner />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Inteligencia financiera</h1>
        <p className={styles.subtitle}>Un vistazo a cómo va tu mes actual, en tiempo real</p>
      </div>

      <DailyAvailableCard dailyAvailable={dailyAvailable} />
      <MonthEndProjectionCard projection={projection} />
      <SmartAlertsPanel alerts={alerts} />
      <RecurringExpensesCard recurring={recurring} />
      <AutoInsightsList insights={autoInsights} />
    </div>
  )
}
