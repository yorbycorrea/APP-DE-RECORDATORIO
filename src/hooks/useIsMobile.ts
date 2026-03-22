// ¿Por qué un hook y no solo media queries CSS?
// CSS media queries resuelven el 80% de los casos — layout, tamaños, visibilidad.
// Pero hay decisiones que necesitan JavaScript:
// - Cambiar props de Framer Motion (animaciones diferentes en móvil)
// - Renderizar componentes distintos (ej: bottom sheet vs dropdown)
// - Cambiar cantidades (ej: mostrar menos items en móvil)
//
// ¿Por qué window.innerWidth y no matchMedia?
// matchMedia es más correcto semánticamente, pero window.innerWidth da el valor
// inicial sincronamente sin riesgo de hydration mismatch.
// En el listener usamos matchMedia para eficiencia (no calcula en cada pixel).

import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return isMobile
}
