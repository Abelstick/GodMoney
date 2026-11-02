import { ActionIcon, Menu } from '@mantine/core'
import { IconDots, IconPencil, IconTrash, IconCake, IconBulb } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button/Button'
import { formatCurrency } from '@/lib/formatters'
import { formatDayMonth, nextAnnualDate, daysUntil, countdownLabel, GIFT_STATUS } from '@/lib/giftPlanning'
import { GiftRow } from './GiftRow'
import rowStyles from './GiftRow.module.css'
import styles from './GiftCards.module.css'

export function PersonCard({ person, gifts, onEdit, onDelete, onAddIdea, giftHandlers }) {
  const mine = gifts.filter((g) => g.person_id === person.id)
  const ideas = mine.filter((g) => g.status !== GIFT_STATUS.DONE)
  const given = mine.filter((g) => g.status === GIFT_STATUS.DONE && g.direction === 'GIVEN')
  const lastGiven = given.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0]
  const totalGiven = given.reduce((acc, g) => acc + Number(g.amount ?? 0), 0)

  const hasBirthday = person.birth_month && person.birth_day
  const days = hasBirthday ? daysUntil(nextAnnualDate(person.birth_month, person.birth_day)) : null

  return (
    <article className={styles.card}>
      <header className={styles.top}>
        <div className={styles.info}>
          <span className={styles.avatar} aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
          <div className={styles.titleWrap}>
            <h3 className={styles.name}>{person.name}</h3>
            <span className={styles.sub}>
              {person.relationship && <span>{person.relationship}</span>}
              {hasBirthday && (
                <span className={days <= 14 ? styles.countdownSoon : styles.countdown}>
                  <IconCake size={14} aria-hidden="true" /> {formatDayMonth(person.birth_month, person.birth_day)} · {countdownLabel(days).toLowerCase()}
                </span>
              )}
            </span>
          </div>
        </div>
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray" size="lg" aria-label={`Más acciones para ${person.name}`}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(person)}>Editar</Menu.Item>
            <Menu.Item leftSection={<IconTrash size={16} />} color="expense" onClick={() => onDelete(person)}>Eliminar</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </header>

      {person.notes && <p className={styles.muted}>{person.notes}</p>}

      {given.length > 0 && (
        <p className={styles.muted}>
          Le regalaste {given.length} {given.length === 1 ? 'vez' : 'veces'} ({formatCurrency(totalGiven)}).
          {lastGiven && <> Último: <strong>{lastGiven.title}</strong>.</>}
        </p>
      )}

      {ideas.length > 0 && (
        <ul className={rowStyles.list}>
          {ideas.map((g) => <GiftRow key={g.id} gift={g} showPerson={false} showOccasion {...giftHandlers} />)}
        </ul>
      )}

      <Button size="sm" variant="secondary" onClick={() => onAddIdea(person)} leftSection={<IconBulb size={16} />}>
        Agregar idea
      </Button>
    </article>
  )
}
