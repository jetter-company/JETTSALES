import { useEffect, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/** Explosão discreta de partículas prateadas. Usada uma única vez, ao marcar Ganho. */
export function Particulas({ ativo, aoTerminar }: { ativo: boolean; aoTerminar: () => void }) {
  const reduzir = useReducedMotion()
  const particulas = useMemo(
    () =>
      Array.from({ length: 34 }).map((_, i) => {
        const ang = (i / 34) * Math.PI * 2 + Math.random() * 0.4
        const dist = 90 + Math.random() * 150
        return { id: i, x: Math.cos(ang) * dist, y: Math.sin(ang) * dist - 40, tamanho: 3 + Math.random() * 5, atraso: Math.random() * 0.08 }
      }),
    [ativo],
  )
  useEffect(() => {
    if (!ativo) return
    const t = setTimeout(aoTerminar, reduzir ? 50 : 1300)
    return () => clearTimeout(t)
  }, [ativo, aoTerminar, reduzir])
  if (!ativo || reduzir) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center" aria-hidden>
      {particulas.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{ width: p.tamanho, height: p.tamanho, background: 'linear-gradient(135deg,#ffffff,#b9bac3)', boxShadow: '0 0 8px rgba(255,255,255,0.6)' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: p.x, y: p.y + 60, opacity: 0, scale: 1 }}
          transition={{ duration: 1.1, delay: p.atraso, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  )
}
