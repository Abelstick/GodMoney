import { useInsights } from '@/hooks/useInsights'
import { Skeleton } from '@/components/common/Skeleton/Skeleton'
import { Disclaimer } from '@/components/common/Disclaimer/Disclaimer'
import { Button }   from '@/components/ui/Button/Button'
import { PageHeader } from '@/components/ui/PageHeader/PageHeader'
import { MonthEndProjectionCard } from './components/MonthEndProjectionCard'
import { DailyAvailableCard }     from './components/DailyAvailableCard'
import { SmartAlertsPanel }       from './components/SmartAlertsPanel'
import { RecurringExpensesCard }  from './components/RecurringExpensesCard'
import { AutoInsightsList }       from './components/AutoInsightsList'
import styles from './Insights.module.css'

export function Insights() {
  const { loading, error, projection, dailyAvailable, alerts, recurring, autoInsights, refetch } = useInsights()

  return (
    <div>
      <PageHeader
        title="Inteligencia financiera"
        subtitle="Un vistazo a cómo va tu mes actual, en tiempo real"
      />

      {loading ? (
        <div className={styles.skeletonWrap}>
          <Skeleton className={styles.heroSkeleton} />
          <Skeleton className={styles.projectionSkeleton} />
          <Skeleton className={styles.alertsSkeleton} />
          <Skeleton className={styles.recurringSkeleton} />
          <Skeleton className={styles.listSkeleton} />
        </div>
      ) : error ? (
        <div className={styles.errorBanner} role="alert">
          <div>
            <p className={styles.errorTitle}>No pudimos cargar tu inteligencia financiera</p>
            <p className={styles.errorDesc}>Revisa tu conexión e inténtalo de nuevo.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={refetch}>Reintentar</Button>
        </div>
      ) : (
        <>
          <DailyAvailableCard dailyAvailable={dailyAvailable} />
          <MonthEndProjectionCard projection={projection} />
          <SmartAlertsPanel alerts={alerts} />
          <RecurringExpensesCard recurring={recurring} />
          <AutoInsightsList insights={autoInsights} />
        </>
      )}
      <Disclaimer />
    </div>
  )
}
