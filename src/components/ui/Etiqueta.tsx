import type { ReactNode } from 'react'
import { cx } from './cx'

type Tom = 'neutro' | 'acento' | 'recebido' | 'atrasado' | 'erro' | 'prata'

const tons: Record<Tom, string> = {
  neutro: 'bg-white/[0.06] text-prata border-white/[0.08]',
  prata: 'bg-prata/10 text-platina border-prata/25',
  acento: 'bg-acento/15 text-[#a9baff] border-acento/30',
  recebido: 'bg-recebido/12 text-[#7ad7b3] border-recebido/30',
  atrasado: 'bg-atrasado/12 text-[#f0c27a] border-atrasado/30',
  erro: 'bg-erro/12 text-[#ff8a8e] border-erro/30',
}

export function Etiqueta({ tom = 'neutro', children, className, ponto }: { tom?: Tom; children: ReactNode; className?: string; ponto?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-xs border px-2 py-0.5 text-[12px] font-medium leading-5 whitespace-nowrap', tons[tom], className)}>
      {ponto && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}
