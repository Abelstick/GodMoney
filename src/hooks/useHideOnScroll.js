import { useEffect, useState, useRef } from 'react'

/**
 * true mientras el usuario scrollea hacia abajo (lee contenido);
 * vuelve a false al scrollear hacia arriba o al detenerse.
 */
export function useHideOnScroll(threshold = 8) {
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    lastY.current = window.scrollY

    function onScroll() {
      const y = window.scrollY
      const diff = y - lastY.current

      if (Math.abs(diff) > threshold) {
        setHidden(diff > 0 && y > 80)
        lastY.current = y
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return hidden
}
