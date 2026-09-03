import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cx } from './cx'

const baseCampo =
  'w-full h-11 px-3.5 rounded-sm bg-white/[0.04] border border-white/[0.09] text-platina text-[15px] ' +
  'placeholder:text-prata-3 transition-colors duration-200 hover:border-white/[0.16] ' +
  'focus:border-acento/70 focus:bg-white/[0.05] focus:outline-none disabled:opacity-50'

export interface CampoProps {
  rotulo?: string
  dica?: string
  erro?: string
  obrigatorio?: boolean
  children: ReactNode
  className?: string
  htmlFor?: string
}

export function Campo({ rotulo, dica, erro, obrigatorio, children, className, htmlFor }: CampoProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {rotulo && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-prata-2">
          {rotulo}
          {obrigatorio && <span className="ml-1 text-acento">*</span>}
        </label>
      )}
      {children}
      {erro ? <p className="text-xs text-erro">{erro}</p> : dica ? <p className="text-xs text-prata-3">{dica}</p> : null}
    </div>
  )
}

export interface EntradaProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string
  dica?: string
  erro?: string
  prefixo?: ReactNode
}

export const Entrada = forwardRef<HTMLInputElement, EntradaProps>(function Entrada(
  { rotulo, dica, erro, prefixo, className, id, required, ...rest },
  ref,
) {
  const gerado = useId()
  const idFinal = id ?? gerado
  const campo = (
    <div className="relative">
      {prefixo && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-prata-3">{prefixo}</span>}
      <input
        ref={ref}
        id={idFinal}
        required={required}
        className={cx(baseCampo, !!prefixo && 'pl-10', !!erro && 'border-erro/60', className)}
        {...rest}
      />
    </div>
  )
  if (!rotulo && !dica && !erro) return campo
  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro} obrigatorio={required} htmlFor={idFinal}>
      {campo}
    </Campo>
  )
})

export interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo?: string
  dica?: string
  erro?: string
  opcoes: { valor: string; nome: string }[]
  vazio?: string
}

export const Selecao = forwardRef<HTMLSelectElement, SelecaoProps>(function Selecao(
  { rotulo, dica, erro, opcoes, vazio, className, id, required, ...rest },
  ref,
) {
  const gerado = useId()
  const idFinal = id ?? gerado
  const campo = (
    <div className="relative">
      <select
        ref={ref}
        id={idFinal}
        required={required}
        className={cx(baseCampo, 'appearance-none pr-10 cursor-pointer', erro && 'border-erro/60', className)}
        {...rest}
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="bg-fundo-2 text-platina">
            {o.nome}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-prata-3" aria-hidden />
    </div>
  )
  if (!rotulo && !dica && !erro) return campo
  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro} obrigatorio={required} htmlFor={idFinal}>
      {campo}
    </Campo>
  )
})

export interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo?: string
  dica?: string
  erro?: string
}

export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(function AreaTexto(
  { rotulo, dica, erro, className, id, required, ...rest },
  ref,
) {
  const gerado = useId()
  const idFinal = id ?? gerado
  const campo = (
    <textarea
      ref={ref}
      id={idFinal}
      required={required}
      className={cx(baseCampo, 'h-auto min-h-[96px] py-2.5 resize-y', erro && 'border-erro/60', className)}
      {...rest}
    />
  )
  if (!rotulo && !dica && !erro) return campo
  return (
    <Campo rotulo={rotulo} dica={dica} erro={erro} obrigatorio={required} htmlFor={idFinal}>
      {campo}
    </Campo>
  )
})

export interface AlternadorProps {
  marcado: boolean
  aoMudar: (v: boolean) => void
  rotulo: string
  descricao?: string
  desabilitado?: boolean
}

export function Alternador({ marcado, aoMudar, rotulo, descricao, desabilitado }: AlternadorProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={marcado}
      disabled={desabilitado}
      onClick={() => aoMudar(!marcado)}
      className="flex w-full items-center justify-between gap-4 rounded-sm px-1 py-2 text-left disabled:opacity-50 min-h-[44px] cursor-pointer"
    >
      <span>
        <span className="block text-[15px] text-platina">{rotulo}</span>
        {descricao && <span className="block text-xs text-prata-3">{descricao}</span>}
      </span>
      <span
        className={cx(
          'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-300',
          marcado ? 'bg-[linear-gradient(135deg,#5b7cff,#8a5cf6)] border-transparent' : 'bg-white/[0.06] border-white/[0.12]',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300',
            marcado ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}

export interface CaixaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string
}

export function Caixa({ rotulo, className, ...rest }: CaixaProps) {
  const id = useId()
  return (
    <label htmlFor={id} className={cx('flex min-h-[44px] cursor-pointer items-center gap-3 text-[15px] text-platina', className)}>
      <input id={id} type="checkbox" className="h-5 w-5 rounded accent-[#6d7cff] cursor-pointer" {...rest} />
      {rotulo}
    </label>
  )
}

/** Grupo de opções em pílulas (uma escolha). */
export function Segmentado<T extends string>({
  valor,
  opcoes,
  aoMudar,
  className,
  rotuloAria,
}: {
  valor: T
  opcoes: { valor: T; nome: string; icone?: ReactNode }[]
  aoMudar: (v: T) => void
  className?: string
  rotuloAria?: string
}) {
  return (
    <div role="radiogroup" aria-label={rotuloAria} className={cx('inline-flex rounded-sm bg-white/[0.04] border border-white/[0.08] p-1 gap-1', className)}>
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={o.valor === valor}
          onClick={() => aoMudar(o.valor)}
          className={cx(
            'inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium transition-colors cursor-pointer',
            o.valor === valor ? 'bg-white/[0.1] text-platina shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-prata-2 hover:text-platina',
          )}
        >
          {o.icone}
          {o.nome}
        </button>
      ))}
    </div>
  )
}
