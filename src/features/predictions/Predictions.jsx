import { usePredictions } from '@/hooks/usePredictions'
import { formatCurrency }  from '@/lib/formatters'
import { Card }            from '@/components/ui/Card/Card'
import { StatCard }        from '@/components/ui/StatCard/StatCard'
import { LoadingSpinner }  from '@/components/common/LoadingSpinner/LoadingSpinner'
import { PredictionChart } from './components/PredictionChart'
import styles from './Predictions.module.css'

export function Predictions() {
  const {
    loading,
    chartData,
    projectedIncome,
    projectedExpense,
    projectedProfit,
    avgMonthlySaving,
    goalsProjection,
  } = usePredictions()

  if (loading) return <LoadingSpinner />

  const noData = chartData.length === 0

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Predicciones financieras</h1>
      <p className={styles.subtitle}>
        Basado en tu historial de los últimos 6 meses usando promedios móviles y regresión lineal
      </p>

      {noData ? (
        <div className={styles.infoBox}>
          Necesitas al menos 1 mes de datos para ver predicciones. Registra ingresos y gastos para comenzar.
        </div>
      ) : (
        <>
          {/* ── Stats proyectados próximo mes ── */}
          <div className={styles.statsGrid}>
            <StatCard
              label="Ingreso estimado (próx. mes)"
              amount={formatCurrency(projectedIncome)}
              icon="💰"
              iconBg="rgba(16,185,129,0.12)"
            />
            <StatCard
              label="Gasto estimado (próx. mes)"
              amount={formatCurrency(projectedExpense)}
              icon="💸"
              iconBg="rgba(239,68,68,0.12)"
            />
            <StatCard
              label="Ahorro estimado (próx. mes)"
              amount={formatCurrency(projectedProfit)}
              icon={projectedProfit >= 0 ? '📈' : '📉'}
              iconBg={projectedProfit >= 0 ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)'}
            />
            <StatCard
              label="Ahorro mensual promedio"
              amount={formatCurrency(avgMonthlySaving)}
              icon="💎"
              iconBg="rgba(245,158,11,0.12)"
            />
          </div>

          {/* ── Gráfico combinado: histórico + proyección ── */}
          <Card className={styles.mb6}>
            <Card.Header>
              <Card.Title subtitle="Histórico + proyección 3 meses · Línea punteada = media móvil">
                Evolución y tendencia
              </Card.Title>
            </Card.Header>
            <PredictionChart data={chartData} />
          </Card>

          {/* ── Proyección de objetivos ── */}
          {goalsProjection.length > 0 && (
            <Card>
              <Card.Header>Tiempo estimado para cada objetivo</Card.Header>
              <div className={styles.goalProjection}>
                {goalsProjection.map((g) => (
                  <div key={g.id} className={styles.goalRow}>
                    <div>
                      <div className={styles.goalName}>{g.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                      </div>
                    </div>
                    <div className={styles.goalEta}>
                      {g.status === 'completed' ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Completado</span>
                      ) : !isFinite(g.monthsLeft) ? (
                        <span style={{ color: 'var(--color-danger)' }}>Sin ahorro positivo</span>
                      ) : g.monthsLeft === 0 ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>¡Listo!</span>
                      ) : (
                        <>
                          Faltan{' '}
                          <span className={styles.goalEtaHighlight}>
                            {g.monthsLeft} {g.monthsLeft === 1 ? 'mes' : 'meses'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
