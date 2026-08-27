// Rangos de calificación del score (escala 1-999, la que usan los buróes en
// Perú), coloreados como semáforo: rojo -> naranja -> dorado -> verde claro
// -> verde oscuro, de menor a mayor puntaje. Los colores están en
// variables.css (--credit-score-1..5) con versión clara/oscura, para que se
// lean bien en ambos temas (los tonos claros como el dorado casi no se ven
// sobre fondo blanco si se usan tal cual).
export const CREDIT_SCORE_RANGES = [
  { min: 1,   max: 476, label: 'Muy bajo',  color: 'var(--credit-score-1)' },
  { min: 477, max: 597, label: 'Bajo',      color: 'var(--credit-score-2)' },
  { min: 598, max: 721, label: 'Medio',     color: 'var(--credit-score-3)' },
  { min: 722, max: 876, label: 'Bueno',     color: 'var(--credit-score-4)' },
  { min: 877, max: 999, label: 'Excelente', color: 'var(--credit-score-5)' },
]

export function getCreditScoreCategory(score) {
  const n = Number(score)
  return CREDIT_SCORE_RANGES.find((r) => n >= r.min && n <= r.max) ?? CREDIT_SCORE_RANGES[0]
}
