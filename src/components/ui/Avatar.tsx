import { iniciais } from '@/lib/formatos'
import { cx } from './cx'

export function Avatar({ nome, fotoUrl, tamanho = 40, className }: { nome: string; fotoUrl?: string | null; tamanho?: number; className?: string }) {
  const estilo = { width: tamanho, height: tamanho, fontSize: Math.max(11, tamanho * 0.36) }
  if (fotoUrl) {
    return <img src={fotoUrl} alt={nome} referrerPolicy="no-referrer" style={estilo} className={cx('rounded-full object-cover border border-white/10 shrink-0', className)} />
  }
  return (
    <span
      style={estilo}
      aria-hidden
      className={cx('inline-flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03))] font-semibold text-platina', className)}
    >
      {iniciais(nome) || '?'}
    </span>
  )
}

/** Monograma "PA" em prata (substituível pela logo do escritório). */
export function Monograma({ tamanho = 40, className }: { tamanho?: number; className?: string }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" className={cx('shrink-0', className)} aria-label="Pedrini & Azevedo" role="img">
      <defs>
        <linearGradient id="mono-prata" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f7" />
          <stop offset="0.55" stopColor="#c9cad1" />
          <stop offset="1" stopColor="#8e8f99" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="62" height="62" rx="16" fill="#0b0b0f" stroke="url(#mono-prata)" strokeOpacity="0.45" />
      <text x="32" y="41" textAnchor="middle" fontFamily="Manrope, system-ui, sans-serif" fontWeight="700" fontSize="27" letterSpacing="-1.5" fill="url(#mono-prata)">
        PA
      </text>
    </svg>
  )
}
