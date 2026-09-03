import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cx } from './cx'

export interface ItemMenu {
  rotulo: string
  icone?: ReactNode
  aoClicar: () => void
  perigo?: boolean
  desabilitado?: boolean
}

/** Menu suspenso simples, alinhado à direita. */
export function Menu({ gatilho, itens, alinhar = 'direita' }: { gatilho: ReactNode; itens: ItemMenu[]; alinhar?: 'direita' | 'esquerda' }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setAberto(false)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [aberto])
  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setAberto((a) => !a)}>{gatilho}</div>
      <AnimatePresence>
        {aberto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className={cx('absolute z-40 mt-1.5 min-w-[200px] vidro-2 bg-fundo-1/95 rounded-md p-1.5 shadow-brilho', alinhar === 'direita' ? 'right-0' : 'left-0')}
          >
            {itens.map((it) => (
              <button
                key={it.rotulo}
                role="menuitem"
                disabled={it.desabilitado}
                onClick={() => {
                  setAberto(false)
                  it.aoClicar()
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-sm transition-colors cursor-pointer disabled:opacity-40',
                  it.perigo ? 'text-[#ff8a8e] hover:bg-erro/15' : 'text-platina hover:bg-white/[0.07]',
                )}
              >
                {it.icone}
                {it.rotulo}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
