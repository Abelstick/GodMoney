import { AnimatePresence, m } from 'framer-motion'
import { IconAlertTriangle, IconAlertOctagon, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react'
import styles from './Results.module.css'

const TONE_ICON = {
  danger: IconAlertOctagon,
  warning: IconAlertTriangle,
  success: IconCircleCheck,
  info: IconInfoCircle,
}

const TONE_LABEL = { danger: 'Alerta', warning: 'Atención', success: 'Bien', info: 'Dato' }

// Avisos calculados por el motor (lib/simulation/insights.js).
export function InsightsList({ insights }) {
  if (!insights.length) return null
  return (
    <ul className={styles.insights} aria-label="Alertas y recomendaciones">
      <AnimatePresence initial={false} mode="popLayout">
        {insights.map((insight) => {
          const Icon = TONE_ICON[insight.tone]
          return (
            <m.li
              key={insight.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className={styles.insight}
              data-tone={insight.tone}
            >
              <span className={styles.insightIcon}>
                <Icon size={18} stroke={1.9} aria-hidden="true" />
                <span className={styles.srOnly}>{TONE_LABEL[insight.tone]}: </span>
              </span>
              <span>
                <span className={styles.insightTitle}>{insight.title}</span>
                <span className={styles.insightDetail}>{insight.detail}</span>
              </span>
            </m.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
