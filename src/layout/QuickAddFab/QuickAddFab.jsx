import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconPlus, IconCashBanknote, IconShoppingCart } from '@tabler/icons-react'
import styles from './QuickAddFab.module.css'

export function QuickAddFab({ hidden = false }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className={`${styles.wrap} ${hidden && !open ? styles.wrapHidden : ''}`}>
        {open && (
          <div className={styles.menu}>
            <Link to="/ingresos" className={styles.item} onClick={() => setOpen(false)}>
              <IconCashBanknote size={18} stroke={1.75} />
              Registrar ingreso
            </Link>
            <Link to="/gastos" className={styles.item} onClick={() => setOpen(false)}>
              <IconShoppingCart size={18} stroke={1.75} />
              Registrar gasto
            </Link>
          </div>
        )}

        <button
          type="button"
          className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-label="Registrar transacción"
        >
          <IconPlus size={26} stroke={2} />
        </button>
      </div>
    </>
  )
}
