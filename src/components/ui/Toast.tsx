import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'
import { cx } from './cx'

type Tipo = 'sucesso' | 'erro' | 'info' | 'aviso'
interface Toast {
  id: number
  tipo: Tipo
  titulo: string
  descricao?: string
  acao?: { rotulo: string; aoClicar: () => void }
}

interface ToastCtx {
  mostrar: (t: Omit<Toast, 'id'>) => void
  sucesso: (titulo: string, descricao?: string) => void
  erro: (titulo: string, descricao?: string) => void
  info: (titulo: string, descricao?: string) => void
}

const Ctx = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([])
  const seq = useRef(0)
  const remover = useCallback((id: number) => setLista((l) => l.filter((t) => t.id !== id)), [])
  const mostrar = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++seq.current
      setLista((l) => [...l.slice(-3), { ...t, id }])
      setTimeout(() => remover(id), t.tipo === 'erro' ? 6500 : 4200)
    },
    [remover],
  )
  const valor = useMemo<ToastCtx>(
    () => ({
      mostrar,
      sucesso: (titulo, descricao) => mostrar({ tipo: 'sucesso', titulo, descricao }),
      erro: (titulo, descricao) => mostrar({ tipo: 'erro', titulo, descricao }),
      info: (titulo, descricao) => mostrar({ tipo: 'info', titulo, descricao }),
    }),
    [mostrar],
  )
  const icones: Record<Tipo, ReactNode> = {
    sucesso: <CheckCircle2 className="h-5 w-5 text-recebido" />,
    erro: <XCircle className="h-5 w-5 text-erro" />,
    aviso: <AlertTriangle className="h-5 w-5 text-atrasado" />,
    info: <Info className="h-5 w-5 text-acento" />,
  }
  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] sm:bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {lista.map((t) => (
            <motion.div
              key={t.id}
              role="status"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={cx('pointer-events-auto vidro-2 bg-fundo-1/95 rounded-md px-4 py-3 flex items-start gap-3 w-full max-w-sm shadow-brilho')}
            >
              {icones[t.tipo]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-platina">{t.titulo}</p>
                {t.descricao && <p className="text-xs text-prata-2 mt-0.5">{t.descricao}</p>}
              </div>
              {t.acao && (
                <button
                  className="text-xs font-semibold text-[#a9baff] hover:text-white cursor-pointer"
                  onClick={() => {
                    t.acao?.aoClicar()
                    remover(t.id)
                  }}
                >
                  {t.acao.rotulo}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
