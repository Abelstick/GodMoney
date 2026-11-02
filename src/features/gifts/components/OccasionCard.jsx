import { ActionIcon, Menu } from '@mantine/core'
import { IconDots, IconPencil, IconTrash, IconPigMoney, IconPlus } from '@tabler/icons-react'
import { Badge } from '@/components/ui/Badge/Badge'
import { Button } from '@/components/ui/Button/Button'
import { ProgressBar } from '@/components/ui/ProgressBar/ProgressBar'
import { formatCurrency, formatDate } from '@/lib/formatters'
import {
  OCCASION_KIND_META, countdownLabel, occasionBudgetSummary, monthlySavingSuggestion,
} from '@/lib/giftPlanning'
import { GiftRow } from './GiftRow'
import rowStyles from './GiftRow.module.css'
import styles from './GiftCards.module.css'

export function OccasionCard({
  occasion, cycle, gifts, goal, onAddGift, onEdit, onDelete, onCreateGoal, giftHandlers,
}) {
  const kind = OCCASION_KIND_META[occasion.kind] ?? OCCASION_KIND_META.OTHER
  const summary = occasionBudgetSummary(occasion, gifts, cycle.year)
  const saved = goal ? Number(goal.progressAmount ?? goal.current_amount ?? 0) : 0
  const suggestion = monthlySavingSuggestion({
    budget: summary.budget,
    alreadyCovered: summary.spent + saved,
    date: cycle.date,
  })
  const soon = cycle.days <= Number(occasion.reminder_days_before ?? 14)

  return (
    <article className={styles.card} data-soon={soon || undefined}>
      <header className={styles.top}>
        <div className={styles.info}>
          <span className={styles.dateBox} aria-hidden="true">
            <span className={styles.dateDay}>{cycle.date.slice(8, 10)}</span>
            <span className={styles.dateMonth}>{formatDate(cycle.date).split(' ')[1]}</span>
          </span>
          <div className={styles.titleWrap}>
            <h3 className={styles.name}>{occasion.name}</h3>
            <span className={styles.sub}>
              <Badge color={kind.color}>{kind.label}</Badge>
              <span className={soon ? styles.countdownSoon : styles.countdown}>{countdownLabel(cycle.days)}</span>
            </span>
          </div>
        </div>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label={`Más acciones para ${occasion.name}`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(occasion)}>Editar</Menu.Item>
            <Menu.Item leftSection={<IconTrash size={16} />} color="expense" onClick={() => onDelete(occasion)}>Eliminar</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </header>

      {summary.budget ? (
        <div className={styles.budget}>
          <div className={styles.budgetLine}>
            <span>Presupuesto {cycle.year}</span>
            <strong>{formatCurrency(summary.budget)}</strong>
          </div>
          <ProgressBar
            percent={summary.percent}
            color={summary.percent > 100 ? 'expense' : summary.percent > 85 ? 'yellow' : 'brand'}
            leftLabel={`Gastado ${formatCurrency(summary.spent)}${summary.planned ? ` · planificado ${formatCurrency(summary.planned)}` : ''}`}
            rightLabel={summary.remaining >= 0 ? `Quedan ${formatCurrency(summary.remaining)}` : `Excedido ${formatCurrency(-summary.remaining)}`}
          />
        </div>
      ) : (
        <p className={styles.muted}>
          Sin presupuesto. {summary.spent > 0 && <>Llevas {formatCurrency(summary.spent)} gastado.</>}
        </p>
      )}

      {summary.budget && (
        <div className={styles.saving}>
          <IconPigMoney size={18} stroke={1.75} aria-hidden="true" />
          {goal ? (
            <span>
              Ahorrado <strong>{formatCurrency(saved)}</strong> en “{goal.name}”
              {suggestion?.perMonth > 0 && <> · aparta {formatCurrency(suggestion.perMonth)}/mes</>}
            </span>
          ) : suggestion?.perMonth > 0 ? (
            <span>
              Aparta <strong>{formatCurrency(suggestion.perMonth)}/mes</strong>
              {suggestion.months > 1 ? ` durante ${suggestion.months} meses` : ' este mes'}
            </span>
          ) : (
            <span>Presupuesto cubierto</span>
          )}
          {!goal && suggestion?.perMonth > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onCreateGoal(occasion, cycle)}>Crear ahorro</Button>
          )}
        </div>
      )}

      {summary.gifts.length > 0 && (
        <ul className={rowStyles.list}>
          {summary.gifts.map((g) => (
            <GiftRow key={g.id} gift={g} {...giftHandlers} />
          ))}
        </ul>
      )}

      <Button size="sm" variant="secondary" onClick={() => onAddGift(occasion)} leftSection={<IconPlus size={16} />}>
        Agregar regalo
      </Button>
    </article>
  )
}
