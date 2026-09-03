import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cascata, itemCascata } from '@/lib/motion'
import { cx } from '@/components/ui'

/** Cabeçalho padrão de tela com uma única sequência de entrada. */
export function Pagina({ titulo, subtitulo, acoes, children, className }: { titulo: ReactNode; subtitulo?: ReactNode; acoes?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <motion.div variants={cascata(0.05)} initial="oculto" animate="visivel" className={cx('flex flex-col gap-5', className)}>
      <motion.div variants={itemCascata} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-platina">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-prata-2">{subtitulo}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </motion.div>
      {children}
    </motion.div>
  )
}

export const Secao = motion.section
export const secaoVariants = itemCascata
