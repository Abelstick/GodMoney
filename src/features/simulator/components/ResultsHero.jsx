import { m } from 'framer-motion'
import { IconFlask } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import { formatDate, formatSignedCurrency } from '@/lib/formatters'
import { fromCents } from '@/lib/simulation/money'
import styles from './Results.module.css'

const pct = (value) => `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} %`

// Cifra que "asienta" al cambiar: un leve fundido cuando el cálculo se actualiza.
function Settle({ value, children }) {
  return (
    <m.span
      key={value}
      initial={{ opacity: 0.35, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={styles.settle}
    >
      {children}
    </m.span>
  )
}

export function ResultsHero({ summary, window }) {
  const variationTone = summary.variation > 0 ? 'up' : summary.variation < 0 ? 'down' : 'flat'
  const minTone = summary.min.balance < 0 ? 'danger' : summary.min.balance < summary.threshold ? 'warning' : null
  const committed = summary.committedPct

  return (
    <section className={styles.hero} aria-label="Resultado de la simulación">
      <div className={styles.heroTop}>
        <span className={styles.heroLabel}>Saldo final estimado · {formatDate(window.to)}</span>
        <span className={styles.heroBadge}><IconFlask size={14} stroke={2} aria-hidden="true" /> Simulación</span>
      </div>

      <div className={styles.heroAmount} aria-live="polite">
        <Settle value={summary.final}>
          <Money value={fromCents(summary.final)} size="xl" tone={summary.final < 0 ? 'expense' : 'neutral'} />
        </Settle>
      </div>

      <span className={`${styles.variation} ${styles[`variation-${variationTone}`]}`}>
        {formatSignedCurrency(fromCents(summary.variation))}
        {summary.variationPct !== null && ` (${summary.variation >= 0 ? '+' : ''}${pct(summary.variationPct)})`}
        {' '}vs. hoy
      </span>

      <dl className={styles.heroGrid}>
        <div className={styles.heroStat}>
          <dt>Saldo de partida</dt>
          <dd><Money value={fromCents(summary.initial)} /></dd>
        </div>
        <div className={styles.heroStat}>
          <dt>Ingresos proyectados</dt>
          <dd><Money value={fromCents(summary.income)} tone="income" signed /></dd>
        </div>
        <div className={styles.heroStat}>
          <dt>Gastos proyectados</dt>
          <dd><Money value={fromCents(summary.outflow)} tone="expense" signed /></dd>
        </div>
        <div className={styles.heroStat}>
          <dt>Dinero comprometido</dt>
          <dd>
            {committed === null ? '—' : pct(committed)}
            {committed !== null && (
              <span className={styles.meter} aria-hidden="true">
                <span style={{ width: `${Math.min(committed, 100)}%` }} data-over={committed > 100 || undefined} />
              </span>
            )}
          </dd>
        </div>
        <div className={`${styles.heroStat} ${styles.heroStatWide}`} data-tone={minTone ?? undefined}>
          <dt>Saldo mínimo</dt>
          <dd>
            <Money value={fromCents(summary.min.balance)} tone={summary.min.balance < 0 ? 'expense' : 'neutral'} />
            <span className={styles.heroStatMeta}>
              {summary.min.date === window.from ? 'al inicio' : `el ${formatDate(summary.min.date)}`}
            </span>
          </dd>
        </div>
      </dl>
    </section>
  )
}
