import { useState } from 'react'
import { AnimatePresence, m } from 'framer-motion'
import { ActionIcon, Menu, Switch } from '@mantine/core'
import { IconDots, IconPencil, IconCopy, IconTrash, IconPlus, IconDownload, IconFlask, IconEye, IconEyeOff } from '@tabler/icons-react'
import { Card } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Money } from '@/components/ui/Money/Money'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import { EVENT_TYPES, sortEvents } from '@/lib/simulation/scenarioModel'
import { repeatLabel } from '@/lib/simulation/recurrence'
import { formatDate, formatRelativeDay } from '@/lib/formatters'
import { fromCents } from '@/lib/simulation/money'
import { EVENT_META } from './eventMeta'
import { QuickEntry } from './QuickEntry'
import { EventInlineEdit } from './EventInlineEdit'
import { ListTotals } from './ListTotals'
import styles from './Builder.module.css'

// Un evento que no tiene ninguna ocurrencia dentro del periodo proyectado.
function isOutOfRange(event, window) {
  if (event.date > window.to) return true
  if (event.repeat === 'once') return event.date < window.from
  return Boolean(event.until) && event.until < window.from
}

const TONE_SIGN = { income: 'income', expense: 'expense', debt: 'expense', saving: 'expense', transfer: 'neutral' }

function EventRow({ event, accountsById, outOfRange, editing, onStartEdit, onStopEdit, onSave, onEdit, onDuplicate, onRemove, onToggle }) {
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
      {editing ? (
        <EventInlineEdit
          event={event}
          focusField={editing}
          onSave={(next) => { onSave(next); onStopEdit() }}
          onCancel={onStopEdit}
          onMore={(next) => { onStopEdit(); onEdit(next) }}
        />
      ) : (
      <>
      <button
        type="button"
        className={styles.eventMain}
        onClick={(e) => {
          // Una transferencia necesita sus cuentas: va directo al formulario.
          if (event.type === 'transfer') onEdit(event)
          else onStartEdit(event.id, e.target.closest('[data-amount]') ? 'amount' : 'description')
        }}
      >
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
        <span data-amount>
          <Money
            value={event.amount}
            tone={TONE_SIGN[event.type]}
            signed={event.type !== 'transfer'}
            className={styles.eventAmount}
          />
        </span>
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
          <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(event)}>Más detalles</Menu.Item>
          <Menu.Item
            leftSection={event.enabled ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            onClick={() => onToggle(event.id)}
          >
            {event.enabled ? 'Excluir de la simulación' : 'Incluir en la simulación'}
          </Menu.Item>
          <Menu.Item leftSection={<IconCopy size={16} />} onClick={() => onDuplicate(event.id)}>Duplicar</Menu.Item>
          <Menu.Item leftSection={<IconTrash size={16} />} color="red" onClick={() => onRemove(event)}>Eliminar</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      </>
      )}
    </m.li>
  )
}

export function EventList({
  events, window, accounts, summary, defaultDate,
  onAdd, onQuickAdd, onPasted, onImport, onUpdate, onEdit, onDuplicate, onRemove, onToggle,
}) {
  const [editing, setEditing] = useState(null) // { id, field }
  const accountsById = Object.fromEntries(accounts.map((a) => [a.id, a]))
  const sorted = sortEvents(events)
  const active = events.filter((e) => e.enabled).length

  return (
    <Card className={styles.listCard}>
      <div className={styles.listBody}>
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
          <Button size="sm" variant="secondary" leftSection={<IconPlus size={16} />} onClick={onAdd}>
            Con detalles
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          compact
          icon={<IconFlask size={32} stroke={1.5} />}
          title="Arma tu escenario"
          description="Escribe abajo un concepto y su precio, o pega tu lista de Excel, y mira al instante cuánto te quedaría. Nada de esto toca tus cuentas reales."
          action={<Button variant="secondary" onClick={onImport}>Importar mis pagos y sueldos</Button>}
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
                editing={editing?.id === event.id ? editing.field : null}
                onStartEdit={(id, field) => setEditing({ id, field })}
                onStopEdit={() => setEditing((cur) => (cur?.id === event.id ? null : cur))}
                onSave={onUpdate}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onRemove={onRemove}
                onToggle={onToggle}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <QuickEntry
        defaultDate={defaultDate}
        onAdd={onQuickAdd}
        onPasted={onPasted}
        result={events.length > 0 && (
          <p className={styles.quickResult}>
            <span>Te quedaría al {formatDate(window.to)}</span>
            <Money value={fromCents(summary.final)} tone={summary.final < 0 ? 'expense' : 'neutral'} className={styles.quickResultValue} />
          </p>
        )}
      />
      {events.length > 0 && <ListTotals summary={summary} windowEnd={window.to} />}
      </div>
    </Card>
  )
}
