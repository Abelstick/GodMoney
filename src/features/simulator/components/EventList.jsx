import { AnimatePresence, m } from 'framer-motion'
import { ActionIcon, Menu, Switch } from '@mantine/core'
import { IconDots, IconPencil, IconCopy, IconTrash, IconPlus, IconDownload, IconFlask } from '@tabler/icons-react'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Money } from '@/components/ui/Money/Money'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { EVENT_TYPES, sortEvents } from '@/lib/simulation/scenarioModel'
import { repeatLabel } from '@/lib/simulation/recurrence'
import { formatRelativeDay } from '@/lib/formatters'
import { EVENT_META } from './eventMeta'
import styles from './Builder.module.css'

// Un evento que no tiene ninguna ocurrencia dentro del periodo proyectado.
function isOutOfRange(event, window) {
  if (event.date > window.to) return true
  if (event.repeat === 'once') return event.date < window.from
  return Boolean(event.until) && event.until < window.from
}

const TONE_SIGN = { income: 'income', expense: 'expense', debt: 'expense', saving: 'expense', transfer: 'neutral' }

function EventRow({ event, accountsById, outOfRange, onEdit, onDuplicate, onRemove, onToggle }) {
  const meta = EVENT_META[event.type]
  const Icon = meta.icon
  const details = [
    formatRelativeDay(event.date),
    event.repeat !== 'once' && repeatLabel(event.repeat, event.date),
    event.type === 'transfer'
      ? `${accountsById[event.accountId]?.name ?? 'Cuenta'} → ${accountsById[event.toAccountId]?.name ?? 'Cuenta'}`
      : event.categoryName,
  ].filter(Boolean)

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={`${styles.eventRow} ${event.enabled ? '' : styles.eventOff}`}
      data-tone={meta.tone}
    >
      <button type="button" className={styles.eventMain} onClick={() => onEdit(event)}>
        <span className={styles.eventIcon} aria-hidden="true"><Icon size={18} stroke={1.9} /></span>
        <span className={styles.eventText}>
          <span className={styles.eventTitle}>
            {event.description || EVENT_TYPES[event.type].label}
          </span>
          <span className={styles.eventMeta}>
            {details.join(' · ')}
            {outOfRange && <span className={styles.outBadge}>Fuera del periodo</span>}
          </span>
        </span>
        <Money
          value={event.amount}
          tone={TONE_SIGN[event.type]}
          signed={event.type !== 'transfer'}
          className={styles.eventAmount}
        />
      </button>
      <Switch
        size="sm"
        checked={event.enabled}
        onChange={() => onToggle(event.id)}
        aria-label={event.enabled ? 'Excluir de la simulación' : 'Incluir en la simulación'}
        className={styles.eventSwitch}
      />
      <Menu position="bottom-end" withinPortal shadow="md">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label={`Acciones de ${event.description || 'este movimiento'}`}>
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(event)}>Editar</Menu.Item>
          <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => onDuplicate(event.id)}>Duplicar</Menu.Item>
          <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => onRemove(event)}>Eliminar</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </m.li>
  )
}

export function EventList({ events, window, accounts, onAdd, onImport, onEdit, onDuplicate, onRemove, onToggle }) {
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const sorted = sortEvents(events)
  const active = events.filter((e) => e.enabled).length

  return (
    <Card className={styles.listCard}>
      <div className={styles.listHead}>
        <div>
          <h2 className={styles.listTitle}>Movimientos hipotéticos</h2>
          <p className={styles.listSub}>
            {events.length === 0
              ? 'Lo que esperas recibir, comprar o pagar'
              : `${active} de ${events.length} incluidos en la simulación`}
          </p>
        </div>
        <div className={styles.listActions}>
          <Button variant="secondary" size="sm" leftSection={<IconDownload size={16} />} onClick={onImport}>
            Importar
          </Button>
          <Button size="sm" leftSection={<IconPlus size={16} />} onClick={onAdd}>
            Agregar
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          compact
          icon={<IconFlask size={32} stroke={1.5} />}
          title="Arma tu escenario"
          description="Agrega un sueldo, una compra o un pago y mira al instante cuánto te quedaría. Nada de esto toca tus cuentas reales."
          action={(
            <div className={styles.emptyActions}>
              <Button onClick={onAdd} leftSection={<IconPlus size={16} />}>Agregar movimiento</Button>
              <Button variant="secondary" onClick={onImport}>Importar mis pagos y sueldos</Button>
            </div>
          )}
        />
      ) : (
        <ul className={styles.eventList}>
          <AnimatePresence initial={false}>
            {sorted.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                accountsById={accountsById}
                outOfRange={isOutOfRange(event, window)}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onRemove={onRemove}
                onToggle={onToggle}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}
