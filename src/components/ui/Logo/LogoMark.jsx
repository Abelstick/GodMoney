/**
 * Isotipo de GodMoney: gema facetada sobre un cuadrado redondeado.
 * El fondo usa el color de marca; las facetas varían de opacidad para dar volumen.
 */
export function LogoMark({ size = 32, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="GodMoney"
      className={className}
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="64" height="64" rx="16" fill="var(--color-primary-dark)" />
      <g fill="#fff" stroke="var(--color-primary-dark)" strokeWidth="1.2" strokeLinejoin="round">
        <path d="M20 19H32L26 28H13Z" fillOpacity="0.92" />
        <path d="M26 28L32 19L38 28Z" />
        <path d="M32 19H44L51 28H38Z" fillOpacity="0.92" />
        <path d="M13 28H26L32 49Z" fillOpacity="0.62" />
        <path d="M26 28H38L32 49Z" fillOpacity="0.85" />
        <path d="M38 28H51L32 49Z" fillOpacity="0.45" />
      </g>
    </svg>
  )
}
