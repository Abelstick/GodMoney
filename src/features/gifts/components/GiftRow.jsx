import { ActionIcon, Menu } from '@mantine/core'
import { IconDots, IconPencil, IconTrash, IconShoppingBag, IconExternalLink, IconCalendarPlus } from '@tabler/icons-react'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { GIFT_STATUS } from '@/lib/giftPlanning'
import styles from './GiftRow.module.css'

const STATUS_LABEL = {
  IDEA: 'Idea',
  PLANNED: 'Planificado',
  DONE: 'Comprado',
}

// Una fila de regalo: título, para quién/de quién, monto y acciones.
export function GiftRow({ gift, showPerson = true, showOccasion = false, onPurchase, onPlan, onEdit, onDelete }) {
  const received = gift.direction === 'RECEIVED'
  const done = gift.status === GIFT_STATUS.DONE
  const amount = done ? gift.amount : gift.estimated_amount
  const statusLabel = received ? 'Recibido' : STATUS_LABEL[gift.status]

  const meta = [
    showPerson && gift.person?.name && `${received ? 'De' : 'Para'} ${gift.person.name}`,
    showOccasion && gift.occasion?.name && `${gift.occasion.name}${gift.year ? ` ${gift.year}` : ''}`,
    done && gift.date && formatDate(gift.date),
  ].filter(Boolean)

  return (
    <li className={styles.row} data-status={received ? 'RECEIVED' : gift.status}>
      <span className={styles.dot} aria-hidden="true" />
      <div className={styles.main}>
        <span className={styles.title}>
          {gift.title}
          {gift.url && (
            <a href={gift.url} target="_blank" rel="noopener noreferrer" className={styles.link}
              aria-label={`Abrir enlace de ${gift.title}`}>
              <IconExternalLink size={14} />
            </a>
          )}
        </span>
        <span className={styles.meta}>
          <span className={styles.status}>{statusLabel}</span>
          {meta.map((m) => <span key={m}>· {m}</span>)}
          {done && !received && !gift.expense_id && <span>· sin gasto vinculado</span>}
        </span>
      </div>
      <span className={styles.amount}>
        {amount ? `${done ? '' : '≈ '}${formatCurrency(amount)}` : '—'}
      </span>
      {!done && onPurchase && (
        <ActionIcon variant="light" size="lg" onClick={() => onPurchase(gift)} aria-label={`Marcar ${gift.title} como comprado`}
          className={styles.quick}>
          <IconShoppingBag size={18} />
        </ActionIcon>
      )}
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size="lg" aria-label={`Más acciones para ${gift.title}`}>
            <IconDots size={18} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {gift.status === GIFT_STATUS.IDEA && onPlan && (
            <Menu.Item leftSection={<IconCalendarPlus size={16} />} onClick={() => onPlan(gift)}>Asignar a una ocasión</Menu.Item>
          )}
          {!done && onPurchase && (
            <Menu.Item leftSection={<IconShoppingBag size={16} />} onClick={() => onPurchase(gift)}>Ya lo compré</Menu.Item>
          )}
          {!received && onEdit && (
            <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(gift)}>Editar</Menu.Item>
          )}
          <Menu.Item leftSection={<IconTrash size={16} />} color="expense" onClick={() => onDelete(gift)}>Eliminar</Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </li>
  )
}
