import { usePredictions } from '@/hooks/usePredictions'
import { formatCurrency }  from '@/lib/formatters'
import { getPredictionConfidence, PREDICTION_CONFIDENCE_META } from './utils/predictionAlgorithms'
import { Card }            from '@/components/ui/Card/Card'
import { StatCard }        from '@/components/ui/StatCard/StatCard'
import { Badge }           from '@/components/ui/Badge/Badge'
import { LoadingSpinner }  from '@/components/common/LoadingSpinner/LoadingSpinner'
import { PredictionChart } from './components/PredictionChart'
import styles from './Predictions.module.css'

function trendProps(value) {
  if (value === null) return {}
  return { trend: `${Math.abs(value)}% vs promedio`, trendUp: value >= 0 }
}

function subtitleText(noData, monthsOfData) {
  if (noData) return 'Basado en tu historial usando promedios móviles y regresión lineal'
  const unit = monthsOfData === 1 ? 'mes' : 'meses'
  return `Basado en tu historial de los últimos ${monthsOfData} ${unit} usando promedios móviles y regresión lineal`
}

function GoalEta({ goal }) {
  if (goal.status === 'completed') return <span className={styles.goalCompleted}>✓ Completado</span>
  if (!Number.isFinite(goal.monthsLeft)) return <span className={styles.goalNoSaving}>Sin ahorro positivo</span>
  if (goal.monthsLeft === 0) return <span className={styles.goalCompleted}>¡Listo!</span>
  return (
    <>
      Faltan{' '}
      <span className={styles.goalEtaHighlight}>
        {goal.monthsLeft} {goal.monthsLeft === 1 ? 'mes' : 'meses'}
      </span>
    </>
  )
}

export function Predictions() {
  const {
    loading,
    chartData,
    monthsOfData,
    projectedIncome,
    projectedExpense,
    projectedProfit,
    avgMonthlySaving,
    incomeTrend,
    expenseTrend,
    profitTrend,
    goalsProjection,
  } = usePredictions()

  if (loading) return <LoadingSpinner />

  const noData = chartData.length === 0
  const confidence = getPredictionConfidence(monthsOfData)
  const confidenceMeta = PREDICTION_CONFIDENCE_META[confidence]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Predicciones financieras</h1>
          <p className={styles.subtitle}>{subtitleText(noData, monthsOfData)}</p>
        </div>
        {!noData && <Badge color={confidenceMeta.color}>{confidenceMeta.label}</Badge>}
      </div>

      {noData ? (
        <div className={styles.infoBox}>
          Necesitas al menos 1 mes de datos para ver predicciones. Registra ingresos y gastos para comenzar.
        </div>
      ) : (
        <>
          {confidence === 'low' && (
            <div className={styles.warnBox}>
              Con pocos meses de historial estas proyecciones son menos precisas. Ganarán exactitud a medida que registres más meses.
            </div>
          )}

          {/* ── Stats proyectados próximo mes ── */}
          <div className={styles.statsGrid}>
            <StatCard
              label="Ingreso estimado (próx. mes)"
              amount={formatCurrency(projectedIncome)}
              icon="💰"
              iconBg="rgba(16,185,129,0.12)"
              {...trendProps(incomeTrend)}
            />
            <StatCard
              label="Gasto estimado (próx. mes)"
              amount={formatCurrency(projectedExpense)}
              icon="💸"
              iconBg="rgba(239,68,68,0.12)"
              invertTrendColor
              {...trendProps(expenseTrend)}
            />
            <StatCard
              label="Ahorro estimado (próx. mes)"
              amount={formatCurrency(projectedProfit)}
              icon={projectedProfit >= 0 ? '📈' : '📉'}
              iconBg={projectedProfit >= 0 ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.12)'}
              {...trendProps(profitTrend)}
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
                      <div className={styles.goalAmounts}>
                        {formatCurrency(g.current_amount)} / {formatCurrency(g.target_amount)}
                      </div>
                    </div>
                    <div className={styles.goalEta}>
                      <GoalEta goal={g} />
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
