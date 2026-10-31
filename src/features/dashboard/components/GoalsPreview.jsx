import { Link } from 'react-router-dom'
import { Button, RingProgress } from '@mantine/core'
import { IconTarget } from '@tabler/icons-react'
import { Money } from '@/components/ui/Money/Money'
import { EmptyState } from '@/components/common/EmptyState/EmptyState'
import styles from './GoalsPreview.module.css'

export function GoalsPreview({ goals, limit = 3 }) {
  if (!goals.length) {
    return (
      <EmptyState
        compact
        icon={<IconTarget size={24} stroke={1.5} />}
        title="Sin objetivos activos"
        description="Ponle nombre y monto a lo que quieres lograr y sigue tu avance aquí."
        action={<Button component={Link} to="/objetivos" size="xs">Crear objetivo</Button>}
      />
    )
  }

  return (
    <ul className={styles.list}>
      {goals.slice(0, limit).map((g) => {
        const amount = g.progressAmount ?? g.current_amount
        const target = Number(g.target_amount)
        const pct = target > 0 ? Math.min(Math.round((amount / target) * 100), 100) : 0
        const remaining = Math.max(target - amount, 0)
        return (
          <li key={g.id}>
            <Link to="/objetivos" className={styles.item}>
              <RingProgress
                size={52}
                thickness={5}
                roundCaps
                sections={[{ value: pct, color: g.color || 'savings' }]}
                label={<span className={styles.pct}>{pct}%</span>}
                aria-label={`${g.name}: ${pct}% completado`}
              />
              <div className={styles.info}>
                <span className={styles.name}>{g.name}</span>
                <span className={styles.sub}>
                  {remaining > 0
                    ? <>Faltan <Money value={remaining} /></>
                    : 'Meta alcanzada'}
                </span>
              </div>
              <Money value={target} className={styles.target} />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
