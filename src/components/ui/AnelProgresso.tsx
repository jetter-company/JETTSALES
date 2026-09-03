import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Anel da meta: preenche com mola. Percentual de 0 a 100. */
export function AnelProgresso({
  percentual,
  tamanho = 148,
  espessura = 10,
  children,
  rotulo,
}: {
  percentual: number
  tamanho?: number
  espessura?: number
  children?: ReactNode
  rotulo?: string
}) {
  const reduzir = useReducedMotion()
  const raio = (tamanho - espessura) / 2
  const circ = 2 * Math.PI * raio
  const p = Math.max(0, Math.min(100, percentual)) / 100
  const id = `anel-${tamanho}`
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: tamanho, height: tamanho }} role="img" aria-label={rotulo ?? `${Math.round(p * 100)}% da meta`}>
      <svg width={tamanho} height={tamanho} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b7cff" />
            <stop offset="100%" stopColor="#8a5cf6" />
          </linearGradient>
        </defs>
        <circle cx={tamanho / 2} cy={tamanho / 2} r={raio} stroke="rgba(255,255,255,0.07)" strokeWidth={espessura} fill="none" />
        <motion.circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          stroke={`url(#${id})`}
          strokeWidth={espessura}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - p) }}
          transition={reduzir ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 18, mass: 1 }}
          style={{ filter: 'drop-shadow(0 0 10px rgba(107,124,255,0.45))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}
