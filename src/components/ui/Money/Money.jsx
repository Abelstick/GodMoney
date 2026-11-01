import { formatCurrency, formatSignedCurrency } from '@/lib/formatters'
import styles from './Money.module.css'

const SIGN_BY_TONE = { income: 1, expense: -1 }

// "−S/ 1,234.56" → signo, moneda, entero, decimales
const PARTS_RE = /^([+−]?)(S\/)\s?([\d,]+)(\.\d+)?$/u

// Monto con formato, cifras tabulares y color semántico.
// tone: 'income' | 'expense' | 'savings' | 'warning' | 'neutral' | 'auto'
//   'auto' colorea según el signo del valor (positivo verde, negativo rojo).
// signed: muestra siempre +/− (para gastos guardados en positivo, el tono
//   'expense' aporta el signo).
// size: 'lg' | 'xl' — en cifras protagonistas la moneda y los decimales van
//   más pequeños y atenuados para que el entero se lea primero.
export function Money({ value, tone = 'neutral', signed = false, size, className = '', ...rest }) {
  const resolvedTone = tone === 'auto'
    ? (Number(value) < 0 ? 'expense' : Number(value) > 0 ? 'income' : 'neutral')
    : tone

  const text = signed
    ? formatSignedCurrency(value, { sign: tone === 'auto' ? undefined : SIGN_BY_TONE[resolvedTone] })
    : formatCurrency(value)

  const parts = size === 'xl' ? text.replaceAll(' ', ' ').match(PARTS_RE) : null

  return (
    <span
      className={[styles.money, styles[resolvedTone], size && styles[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {parts ? (
        <>
          {parts[1] && <span className={styles.sign}>{parts[1]}</span>}
          <span className={styles.currency}>{parts[2]}</span>
          <span>{parts[3]}</span>
          {parts[4] && <span className={styles.decimals}>{parts[4]}</span>}
        </>
      ) : text}
    </span>
  )
}
