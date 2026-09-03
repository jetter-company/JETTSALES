import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { AlertCircle, Building2, Clock, Truck } from 'lucide-react'
import { Etiqueta, cx } from '@/components/ui'
import { ehAntesDeHoje, ehHoje } from '@/lib/datas'
import { hora, moeda, dataCurta } from '@/lib/formatos'
import type { Lead } from '@/lib/tipos'
import { nomeVeiculo } from './acoesLead'

export interface CartaoLeadProps extends HTMLMotionProps<'div'> {
  lead: Lead
  compacto?: boolean
  acoes?: ReactNode
  nomeVendedor?: string
}

/** Cartão do lead usado no kanban e na lista. layoutId permite virar a ficha. */
export const CartaoLead = forwardRef<HTMLDivElement, CartaoLeadProps>(function CartaoLead({ lead, compacto, acoes, nomeVendedor, className, ...rest }, ref) {
  const pa = lead.proximaAcao
  const atrasada = pa && ehAntesDeHoje(pa.dataHora)
  const hoje = pa && ehHoje(pa.dataHora)
  const semAcao = !pa && lead.etapa !== 'ganho' && lead.etapa !== 'perdido'
  return (
    <motion.div
      ref={ref}
      layoutId={`lead-${lead.id}`}
      className={cx(
        'vidro rounded-md p-3.5 flex flex-col gap-2 select-none',
        lead.prioridade && 'border-l-2 border-l-[#a98bff]/70',
        className,
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-platina leading-tight">{lead.nome}</p>
          {(lead.empresa || lead.cidade) && (
            <p className="mt-0.5 truncate text-xs text-prata-2">{[lead.empresa, [lead.cidade, lead.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        {acoes}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {lead.prioridade && (
          <Etiqueta tom="acento">
            {lead.tipoPessoa === 'PJ' ? <Building2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
            {lead.tipoPessoa === 'PJ' ? 'PJ' : 'Frota'}
          </Etiqueta>
        )}
        {lead.tipoVeiculo && !compacto && <Etiqueta>{nomeVeiculo(lead.tipoVeiculo)}</Etiqueta>}
        {lead.servicoInteresse && !compacto && <Etiqueta>{lead.servicoInteresse}</Etiqueta>}
        {!!lead.valorEstimado && <Etiqueta tom="prata">{moeda(lead.valorEstimado)}</Etiqueta>}
        {nomeVendedor && <Etiqueta>{nomeVendedor}</Etiqueta>}
      </div>
      {(pa || semAcao) && (
        <div className={cx('flex items-center gap-1.5 text-xs', atrasada ? 'text-[#f0c27a]' : hoje ? 'text-[#a9baff]' : semAcao ? 'text-[#f0c27a]/90' : 'text-prata-3')}>
          {semAcao ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          {semAcao ? 'Sem próxima ação' : `${hoje ? 'Hoje' : dataCurta(pa!.dataHora)} ${hora(pa!.dataHora)}${pa!.descricao ? ` · ${pa!.descricao}` : ''}`}
        </div>
      )}
    </motion.div>
  )
})
