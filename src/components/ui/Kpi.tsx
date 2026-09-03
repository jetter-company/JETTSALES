import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, useReducedMotion } from 'framer-motion'
import { cx } from './cx'

/** Número que conta até o valor final com easing. */
export function NumeroAnimado({
  valor,
  formatar,
  duracao = 1.1,
  className,
}: {
  valor: number
  formatar: (n: number) => string
  duracao?: number
  className?: string
}) {
  const reduzir = useReducedMotion()
  const [exibido, setExibido] = useState(reduzir ? valor : 0)
  const anterior = useRef(0)
  useEffect(() => {
    if (reduzir) {
      setExibido(valor)
      return
    }
    const controle = animate(anterior.current, valor, {
      duration: duracao,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setExibido(v),
    })
    anterior.current = valor
    return () => controle.stop()
  }, [valor, duracao, reduzir])
  return <span className={cx('tabular', className)}>{formatar(exibido)}</span>
}

export function Kpi({
  rotulo,
  valor,
  formatar,
  detalhe,
  tom = 'neutro',
  tamanho = 'md',
  icone,
  className,
}: {
  rotulo: string
  valor: number
  formatar: (n: number) => string
  detalhe?: ReactNode
  tom?: 'neutro' | 'acento' | 'recebido' | 'atrasado'
  tamanho?: 'md' | 'lg'
  icone?: ReactNode
  className?: string
}) {
  const cor = { neutro: 'text-platina', acento: 'texto-acento', recebido: 'text-[#7ad7b3]', atrasado: 'text-[#f0c27a]' }[tom]
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-prata-2">
        {icone}
        {rotulo}
      </div>
      <NumeroAnimado
        valor={valor}
        formatar={formatar}
        className={cx('font-semibold tracking-tight leading-none', tamanho === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl', cor)}
      />
      {detalhe && <div className="text-xs text-prata-3">{detalhe}</div>}
    </div>
  )
}
