import styles from './Skeleton.module.css'

export function Skeleton({ className = '', style }) {
  return <div className={`${styles.block} ${className}`} style={style} />
}
