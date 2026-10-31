import { formatCurrency, formatSignedCurrency } from '@/lib/formatters'
import styles from './Money.module.css'

const SIGN_BY_TONE = { income: 1, expense: -1 }

// Monto con formato, cifras tabulares y color semántico.
// tone: 'income' | 'expense' | 'savings' | 'warning' | 'neutral' | 'auto'
//   'auto' colorea según el signo del valor (positivo verde, negativo rojo).
// signed: muestra siempre +/− (para gastos guardados en positivo, el tono
//   'expense' aporta el signo).
export function Money({ value, tone = 'neutral', signed = false, size, className = '', ...rest }) {
  const resolvedTone = tone === 'auto'
    ? (Number(value) < 0 ? 'expense' : Number(value) > 0 ? 'income' : 'neutral')
    : tone

  const text = signed
    ? formatSignedCurrency(value, { sign: tone === 'auto' ? undefined : SIGN_BY_TONE[resolvedTone] })
    : formatCurrency(value)

  return (
    <span
      className={[styles.money, styles[resolvedTone], size && styles[size], className].filter(Boolean).join(' ')}
      {...rest}
    >
      {text}
    </span>
  )
}
