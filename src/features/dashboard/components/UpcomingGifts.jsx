import { Link } from 'react-router-dom'
import { Money } from '@/components/ui/Money/Money'
import { formatDate } from '@/lib/formatters'
import { countdownLabel, occasionBudgetSummary, monthlySavingSuggestion, linkedGoal } from '@/lib/giftPlanning'
import styles from './UpcomingGifts.module.css'

// Próximas fechas de regalos (Navidad, cumpleaños…) con lo que falta o lo
// que conviene apartar al mes. `upcoming` viene de upcomingOccasions().
export function UpcomingGifts({ upcoming, gifts, goalsById, limit = 3 }) {
  return (
    <ul className={styles.list}>
      {upcoming.slice(0, limit).map(({ occasion, date, year, days }) => {
        const soon = days <= Number(occasion.reminder_days_before ?? 14)
        const summary = occasionBudgetSummary(occasion, gifts, year)
        const goal = linkedGoal(occasion, year, goalsById)
        const saved = goal ? Number(goal.progressAmount ?? goal.current_amount ?? 0) : 0
        const suggestion = monthlySavingSuggestion({ budget: summary.budget, alreadyCovered: summary.spent + saved, date })

        let detail
        const giftCount = summary.gifts.length
        if (!summary.budget && giftCount) {
          detail = `${giftCount} ${giftCount === 1 ? 'regalo' : 'regalos'}`
        } else if (!summary.budget) {
          detail = 'Sin presupuesto'
        } else if (summary.remaining < 0) {
          detail = <>Excedido <Money value={-summary.remaining} /></>
        } else if (suggestion?.perMonth > 0 && suggestion.months > 1) {
          detail = <>Aparta <Money value={suggestion.perMonth} />/mes</>
        } else {
          detail = <>Quedan <Money value={summary.remaining} /></>
        }

        return (
          <li key={occasion.id}>
            <Link to="/regalos" className={styles.item} data-soon={soon || undefined}>
              <span className={styles.dateBox} aria-hidden="true">
                <span className={styles.day}>{date.slice(8, 10)}</span>
                <span className={styles.month}>{formatDate(date).split(' ')[1]}</span>
              </span>
              <span className={styles.info}>
                <span className={styles.name}>{occasion.name}</span>
                <span className={styles.sub}>{detail}</span>
              </span>
              <span className={soon ? styles.countdownSoon : styles.countdown}>{countdownLabel(days)}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
