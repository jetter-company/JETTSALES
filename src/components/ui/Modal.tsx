import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cx } from './cx'
import { Botao } from './Botao'

export interface ModalProps {
  aberto: boolean
  aoFechar: () => void
  titulo?: ReactNode
  descricao?: ReactNode
  children: ReactNode
  rodape?: ReactNode
  largura?: 'sm' | 'md' | 'lg' | 'xl'
}

const larguras = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }

/** Modal no desktop, folha inferior no celular. */
export function Modal({ aberto, aoFechar, titulo, descricao, children, rodape, largura = 'md' }: ModalProps) {
  const reduzir = useReducedMotion()
  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', tecla)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', tecla)
      document.body.style.overflow = anterior
    }
  }, [aberto, aoFechar])

  return createPortal(
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cx('vidro-2 w-full max-h-[92dvh] flex flex-col rounded-t-xl sm:rounded-xl bg-fundo-1/95', larguras[largura])}
            initial={reduzir ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            {(titulo || descricao) && (
              <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
                <div>
                  {titulo && <h2 className="text-lg font-semibold text-platina">{titulo}</h2>}
                  {descricao && <p className="mt-0.5 text-sm text-prata-2">{descricao}</p>}
                </div>
                <Botao variante="fantasma" tamanho="icone" aria-label="Fechar" onClick={aoFechar} icone={<X className="h-5 w-5" />} />
              </div>
            )}
            <div className="overflow-y-auto px-5 pb-5 sm:px-6 flex-1">{children}</div>
            {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.06] px-5 py-4 sm:px-6 area-segura-inferior">{rodape}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Confirmacao({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  descricao,
  textoConfirmar = 'Confirmar',
  perigo,
  carregando,
}: {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  descricao?: string
  textoConfirmar?: string
  perigo?: boolean
  carregando?: boolean
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      descricao={descricao}
      largura="sm"
      rodape={
        <>
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} onClick={aoConfirmar} carregando={carregando}>
            {textoConfirmar}
          </Botao>
        </>
      }
    >
      <div />
    </Modal>
  )
}
