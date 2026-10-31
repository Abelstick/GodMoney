import { ActionIcon, Menu, UnstyledButton } from '@mantine/core'
import { IconChevronLeft, IconChevronRight, IconChevronDown } from '@tabler/icons-react'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import styles from './MonthPicker.module.css'

function monthLabel(key) {
  const text = format(parseISO(`${key}-01`), 'MMMM yyyy', { locale: es })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Selector compacto ‹ Octubre 2026 › — reemplaza la fila de botones por mes.
// `months` viene ordenado del más antiguo al actual (getPastMonths).
export function MonthPicker({ value, onChange, months }) {
  const index = months.findIndex((m) => m.key === value)
  const prev = index > 0 ? months[index - 1] : null
  const next = index >= 0 && index < months.length - 1 ? months[index + 1] : null

  return (
    <div className={styles.wrap}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={() => prev && onChange(prev.key)}
        disabled={!prev}
        aria-label="Mes anterior"
      >
        <IconChevronLeft size={18} stroke={2} />
      </ActionIcon>

      <Menu position="bottom" shadow="md" width={200} withinPortal>
        <Menu.Target>
          <UnstyledButton className={styles.label} aria-label="Elegir mes">
            <span>{monthLabel(value)}</span>
            <IconChevronDown size={14} stroke={2} aria-hidden="true" />
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown className={styles.dropdown}>
          {[...months].reverse().map((m) => (
            <Menu.Item
              key={m.key}
              onClick={() => onChange(m.key)}
              className={m.key === value ? styles.itemActive : undefined}
            >
              {monthLabel(m.key)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>

      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={() => next && onChange(next.key)}
        disabled={!next}
        aria-label="Mes siguiente"
      >
        <IconChevronRight size={18} stroke={2} />
      </ActionIcon>
    </div>
  )
}
