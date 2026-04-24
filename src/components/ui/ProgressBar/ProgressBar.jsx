import { Progress } from '@mantine/core'
import styles from './ProgressBar.module.css'

export function ProgressBar({ percent = 0, color, leftLabel, rightLabel, size = 'md' }) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const isOver  = percent > 100

  return (
    <div className={styles.wrapper}>
      <Progress
        value={clamped}
        color={isOver ? 'red' : (color ?? 'violet')}
        size={size === 'sm' ? 'xs' : size === 'lg' ? 'md' : 'sm'}
        radius="xl"
      />
      {(leftLabel || rightLabel) && (
        <div className={styles.info}>
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  )
}
