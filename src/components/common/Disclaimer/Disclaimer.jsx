import { Link } from 'react-router-dom'
import styles from './Disclaimer.module.css'

const TEXTS = {
  general: 'Información referencial basada en los datos que tú registras. No constituye asesoría financiera, legal, tributaria ni crediticia.',
  prediction: 'Las proyecciones son estimaciones estadísticas simples y no garantizan resultados futuros. No constituyen asesoría financiera.',
  credit: 'Registro personal informativo. GodMoney no es una central de riesgo ni emite scores oficiales, y no garantiza el acceso a crédito.',
}

export function Disclaimer({ kind = 'general' }) {
  return (
    <p className={styles.disclaimer}>
      {TEXTS[kind] ?? TEXTS.general}{' '}
      <Link to="/terminos">Términos de uso</Link>
    </p>
  )
}
