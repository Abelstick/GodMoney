import { Badge as MBadge } from '@mantine/core'

export function Badge({ children, color = 'var(--color-primary)', withDot = false }) {
  return (
    <MBadge
      variant="light"
      // color-mix funciona tanto si "color" es un hex literal como si es un
      // var(--...) — la concatenación `color + '20'` solo servía para hex.
      style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
      leftSection={withDot ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} /> : undefined}
    >
      {children}
    </MBadge>
  )
}
