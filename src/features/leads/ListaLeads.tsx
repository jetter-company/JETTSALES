import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Phone, MessageCircle, ChevronRight } from 'lucide-react'
import { Botao, Etiqueta, cx } from '@/components/ui'
import { ehAntesDeHoje, ehHoje } from '@/lib/datas'
import { dataHora, moeda } from '@/lib/formatos'
import { formatarTelefone } from '@/lib/telefone'
import { ETAPAS, type Lead } from '@/lib/tipos'
import { cascata, itemCascata } from '@/lib/motion'
import { useAcoesLead } from './acoesLead'
import { ordenarPorProximaAcao } from './Kanban'

export function ListaLeads({ leads, nomesVendedores }: { leads: Lead[]; nomesVendedores?: Record<string, string> }) {
  const navegar = useNavigate()
  const { ligar, whatsapp } = useAcoesLead()
  const ordenados = useMemo(() => [...leads].sort(ordenarPorProximaAcao), [leads])
  const nomeEtapa = (id: string) => ETAPAS.find((e) => e.id === id)?.nome ?? id

  return (
    <motion.ul variants={cascata(0, 0.03)} initial="oculto" animate="visivel" className="flex flex-col gap-2">
      {ordenados.map((l) => {
        const pa = l.proximaAcao
        const atrasada = pa && ehAntesDeHoje(pa.dataHora)
        const hoje = pa && ehHoje(pa.dataHora)
        return (
          <motion.li
            key={l.id}
            variants={itemCascata}
            onClick={() => navegar(`/leads/${l.id}`)}
            className={cx('vidro rounded-md px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-white/[0.16] transition-colors', l.prioridade && 'border-l-2 border-l-[#a98bff]/70')}
          >
            <div className="min-w-0 flex-1 grid gap-x-4 gap-y-1 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr] items-center">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-platina">{l.nome}</p>
                <p className="truncate text-xs text-prata-2">{[l.empresa, formatarTelefone(l.telefone)].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Etiqueta tom={l.etapa === 'ganho' ? 'recebido' : l.etapa === 'perdido' ? 'neutro' : 'prata'}>{nomeEtapa(l.etapa)}</Etiqueta>
                {l.prioridade && <Etiqueta tom="acento">{l.tipoPessoa === 'PJ' ? 'PJ' : 'Frota'}</Etiqueta>}
              </div>
              <div className="text-xs text-prata-2">
                {l.origem && <span className="block truncate">{l.origem}</span>}
                {!!l.valorEstimado && <span className="block tabular text-platina">{moeda(l.valorEstimado)}</span>}
                {nomesVendedores?.[l.vendedorId] && <span className="block truncate text-prata-3">{nomesVendedores[l.vendedorId]}</span>}
              </div>
              <div className={cx('text-xs', atrasada ? 'text-[#f0c27a]' : hoje ? 'text-[#a9baff]' : 'text-prata-3')}>
                {pa ? `Próxima: ${dataHora(pa.dataHora)}` : l.etapa === 'ganho' || l.etapa === 'perdido' ? '' : 'Sem próxima ação'}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Botao tamanho="icone" variante="fantasma" aria-label="Ligar" onClick={() => ligar(l)} icone={<Phone className="h-4 w-4" />} />
              <Botao tamanho="icone" variante="fantasma" aria-label="WhatsApp" onClick={() => whatsapp(l)} icone={<MessageCircle className="h-4 w-4" />} />
            </div>
            <ChevronRight className="h-4 w-4 text-prata-3 shrink-0" />
          </motion.li>
        )
      })}
    </motion.ul>
  )
}
