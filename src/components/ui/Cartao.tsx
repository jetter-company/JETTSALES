import { forwardRef, useCallback, type HTMLAttributes, type ReactNode } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import { cx } from './cx'

type Raio = 'sm' | 'md' | 'lg' | 'xl'
const raios: Record<Raio, string> = { sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl' }

export interface CartaoProps extends HTMLAttributes<HTMLDivElement> {
  raio?: Raio
  brilho?: boolean
  elevar?: boolean
  forte?: boolean
  children?: ReactNode
}

/** Painel de vidro com brilho radial que segue o cursor. */
export const Cartao = forwardRef<HTMLDivElement, CartaoProps>(function Cartao(
  { raio = 'lg', brilho = true, elevar = false, forte = false, className, children, onPointerMove, ...rest },
  ref,
) {
  const mover = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
      onPointerMove?.(e)
    },
    [onPointerMove],
  )
  return (
    <div
      ref={ref}
      onPointerMove={brilho ? mover : onPointerMove}
      className={cx(
        forte ? 'vidro-2' : 'vidro',
        raios[raio],
        brilho && 'brilho-cursor',
        elevar && 'transition-transform duration-300 hover:-translate-y-0.5',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
})

export interface CartaoMotionProps extends HTMLMotionProps<'div'> {
  raio?: Raio
  brilho?: boolean
  forte?: boolean
  children?: ReactNode
}

/** Versão animável (aceita variants, layoutId etc.). */
export const CartaoMotion = forwardRef<HTMLDivElement, CartaoMotionProps>(function CartaoMotion(
  { raio = 'lg', brilho = true, forte = false, className, children, ...rest },
  ref,
) {
  const reduzir = useReducedMotion()
  const mover = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }, [])
  return (
    <motion.div
      ref={ref}
      onPointerMove={brilho && !reduzir ? mover : undefined}
      className={cx(forte ? 'vidro-2' : 'vidro', raios[raio], brilho && 'brilho-cursor', className)}
      {...rest}
    >
      {children}
    </motion.div>
  )
})
