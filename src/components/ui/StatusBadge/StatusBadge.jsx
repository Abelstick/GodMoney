import { Badge } from '@mantine/core'
import {
  IconCircleCheck, IconClock, IconAlertTriangle, IconInfoCircle, IconCircleDashed, IconPigMoney,
} from '@tabler/icons-react'

// Estado semántico: el color nunca va solo, siempre con ícono + texto.
//   ok      → al día / dentro del presupuesto
//   warning → por vencer / cerca del límite
//   danger  → vencido / excedido
const TONES = {
  ok:      { color: 'income',  Icon: IconCircleCheck },
  warning: { color: 'warning', Icon: IconClock },
  danger:  { color: 'expense', Icon: IconAlertTriangle },
  info:    { color: 'brand',   Icon: IconInfoCircle },
  savings: { color: 'savings', Icon: IconPigMoney },
  neutral: { color: 'gray',    Icon: IconCircleDashed },
}

export function StatusBadge({ tone = 'neutral', icon, children, size = 'md' }) {
  const { color, Icon } = TONES[tone] ?? TONES.neutral
  return (
    <Badge
      color={color}
      size={size}
      leftSection={icon ?? <Icon size={size === 'sm' ? 12 : 14} stroke={2} aria-hidden="true" />}
    >
      {children}
    </Badge>
  )
}
