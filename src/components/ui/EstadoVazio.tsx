import type { ReactNode } from 'react'
import { cx } from './cx'

export function EstadoVazio({ icone, titulo, descricao, acao, className }: { icone?: ReactNode; titulo: string; descricao?: string; acao?: ReactNode; className?: string }) {
  return (
    <div className={cx('vidro rounded-lg px-6 py-10 text-center flex flex-col items-center gap-3', className)}>
      {icone && <div className="h-12 w-12 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-prata-2">{icone}</div>}
      <h3 className="text-base font-semibold text-platina">{titulo}</h3>
      {descricao && <p className="max-w-sm text-sm text-prata-2">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}
