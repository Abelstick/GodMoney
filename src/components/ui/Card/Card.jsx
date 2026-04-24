import { Paper } from '@mantine/core'
import styles from './Card.module.css'

export function Card({ children, padded = true, small = false, hoverable = false, className = '', onClick, style }) {
  const classes = [
    styles.card,
    padded && (small ? styles['padded-sm'] : styles.padded),
    hoverable && styles.hoverable,
    className,
  ].filter(Boolean).join(' ')

  return (
    <Paper shadow="xs" className={classes} onClick={onClick} style={style}>
      {children}
    </Paper>
  )
}

Card.Header = function CardHeader({ children, action }) {
  return (
    <div className={styles.header}>
      <div>
        {typeof children === 'string'
          ? <h3 className={styles.title}>{children}</h3>
          : children
        }
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

Card.Title = function CardTitle({ children, subtitle }) {
  return (
    <div>
      <h3 className={styles.title}>{children}</h3>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  )
}
