import styles from './PageHeader.module.css'

// Encabezado único de página: título, subtítulo opcional y acciones a la derecha
// (en móvil las acciones bajan debajo del título).
export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
      {children}
    </header>
  )
}
