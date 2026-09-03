import { forwardRef, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cx } from './cx'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'sucesso'
type Tamanho = 'sm' | 'md' | 'lg' | 'icone'

export interface BotaoProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variante?: Variante
  tamanho?: Tamanho
  carregando?: boolean
  icone?: ReactNode
  iconeDireita?: ReactNode
  children?: ReactNode
  largura?: 'auto' | 'total'
}

const base =
  'relative inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,opacity] duration-200 ' +
  'disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer'

const variantes: Record<Variante, string> = {
  primario:
    'text-white bg-[linear-gradient(135deg,#5b7cff_0%,#8a5cf6_100%)] ' +
    'shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_10px_30px_-12px_rgba(91,124,255,0.7)] ' +
    'hover:shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_14px_36px_-12px_rgba(138,92,246,0.8)]',
  secundario:
    'text-platina bg-white/[0.06] border border-white/[0.1] hover:bg-white/[0.1] hover:border-white/[0.18]',
  fantasma: 'text-prata hover:text-platina hover:bg-white/[0.06]',
  perigo: 'text-white bg-erro/85 hover:bg-erro border border-white/[0.06]',
  sucesso: 'text-fundo-0 bg-recebido hover:brightness-110 border border-white/[0.06]',
}

const tamanhos: Record<Tamanho, string> = {
  sm: 'h-9 px-3 text-[13px] rounded-[10px] min-w-[44px]',
  md: 'h-11 px-4 text-sm rounded-sm',
  lg: 'h-12 px-5 text-[15px] rounded-sm',
  icone: 'h-11 w-11 rounded-sm',
}

/** Botão com leve efeito magnético no desktop. */
export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = 'secundario', tamanho = 'md', carregando, icone, iconeDireita, className, children, largura = 'auto', disabled, ...rest },
  ref,
) {
  const reduzir = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 300, damping: 20, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 300, damping: 20, mass: 0.4 })
  const local = useRef<HTMLButtonElement | null>(null)

  function mover(e: React.PointerEvent<HTMLButtonElement>) {
    if (reduzir || e.pointerType !== 'mouse') return
    const el = local.current
    if (!el) return
    const r = el.getBoundingClientRect()
    x.set(((e.clientX - r.left) / r.width - 0.5) * 6)
    y.set(((e.clientY - r.top) / r.height - 0.5) * 6)
  }
  function sair() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      ref={(el) => {
        local.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      style={{ x: sx, y: sy }}
      whileTap={reduzir ? undefined : { scale: 0.97 }}
      onPointerMove={mover}
      onPointerLeave={sair}
      className={cx(base, variantes[variante], tamanhos[tamanho], largura === 'total' && 'w-full', className)}
      disabled={disabled || carregando}
      {...(rest as object)}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icone}
      {children}
      {!carregando && iconeDireita}
    </motion.button>
  )
})
