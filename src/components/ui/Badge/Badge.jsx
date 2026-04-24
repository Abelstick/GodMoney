import { Badge as MBadge } from '@mantine/core'

export function Badge({ children, color = 'var(--color-primary)', withDot = false }) {
  return (
    <MBadge
      variant="light"
      style={{ backgroundColor: color + '20', color }}
      leftSection={withDot ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} /> : undefined}
    >
      {children}
    </MBadge>
  )
}
