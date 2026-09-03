import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { GripVertical, MoreHorizontal, Phone, MessageCircle, ArrowRightLeft } from 'lucide-react'
import { Botao, Menu, cx, useToast } from '@/components/ui'
import { moeda } from '@/lib/formatos'
import { ETAPAS, type Etapa, type Lead } from '@/lib/tipos'
import { CartaoLead } from './CartaoLead'
import { moverEtapa } from './dados'
import { useAcoesLead } from './acoesLead'

interface Props {
  leads: Lead[]
  nomesVendedores?: Record<string, string>
  aoPedirPerda: (lead: Lead) => void
  aoPedirGanho: (lead: Lead) => void
}

const ETAPAS_KANBAN = ETAPAS

export function Kanban({ leads, nomesVendedores, aoPedirPerda, aoPedirGanho }: Props) {
  const navegar = useNavigate()
  const toast = useToast()
  const reduzir = useReducedMotion()
  const { ligar, whatsapp } = useAcoesLead()
  const [alvo, setAlvo] = useState<Etapa | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [pulso, setPulso] = useState<Etapa | null>(null)
  const toqueGrosso = useToqueGrosso()
  const scrollRef = useRef<HTMLDivElement>(null)

  const porEtapa = useMemo(() => {
    const mapa = new Map<Etapa, Lead[]>()
    for (const e of ETAPAS_KANBAN) mapa.set(e.id, [])
    for (const l of leads) mapa.get(l.etapa)?.push(l)
    for (const [, lista] of mapa) lista.sort(ordenarPorProximaAcao)
    return mapa
  }, [leads])

  const detectarColuna = useCallback((x: number, y: number): Etapa | null => {
    const els = document.elementsFromPoint(x, y)
    for (const el of els) {
      const c = (el as HTMLElement).dataset?.coluna
      if (c) return c as Etapa
    }
    return null
  }, [])

  const mover = useCallback(
    async (lead: Lead, etapa: Etapa) => {
      if (etapa === lead.etapa) return
      if (etapa === 'perdido') return aoPedirPerda(lead)
      if (etapa === 'ganho') return aoPedirGanho(lead)
      setPulso(etapa)
      setTimeout(() => setPulso(null), 500)
      try {
        await moverEtapa(lead.id, etapa, { motivoPerda: undefined })
      } catch (e) {
        console.error(e)
        toast.erro('Não foi possível mover o lead')
      }
    },
    [aoPedirGanho, aoPedirPerda, toast],
  )

  function aoArrastar(_: unknown, info: PanInfo) {
    setAlvo(detectarColuna(info.point.x, info.point.y))
    // Rola o quadro quando o cartão chega perto da borda no desktop.
    const sc = scrollRef.current
    if (sc) {
      const r = sc.getBoundingClientRect()
      if (info.point.x > r.right - 60) sc.scrollLeft += 12
      else if (info.point.x < r.left + 60) sc.scrollLeft -= 12
    }
  }

  function aoSoltar(lead: Lead, info: PanInfo) {
    const destino = detectarColuna(info.point.x, info.point.y)
    setAlvo(null)
    setArrastando(null)
    if (destino) void mover(lead, destino)
  }

  return (
    <LayoutGroup>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none sem-scrollbar">
        {ETAPAS_KANBAN.map((etapa) => {
          const lista = porEtapa.get(etapa.id) ?? []
          const total = lista.reduce((s, l) => s + (l.valorEstimado ?? 0), 0)
          const ehAlvo = alvo === etapa.id
          const final = etapa.id === 'ganho' || etapa.id === 'perdido'
          return (
            <motion.section
              key={etapa.id}
              data-coluna={etapa.id}
              aria-label={etapa.nome}
              animate={pulso === etapa.id && !reduzir ? { scale: [1, 1.015, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={cx(
                'flex w-[84vw] sm:w-[300px] shrink-0 snap-center flex-col rounded-lg border transition-colors duration-200 min-h-[60dvh] md:min-h-[calc(100dvh-260px)]',
                ehAlvo ? 'border-acento/60 bg-acento/[0.07] shadow-[0_0_0_1px_rgba(91,124,255,0.35),0_0_40px_-10px_rgba(91,124,255,0.5)]' : 'border-white/[0.06] bg-white/[0.02]',
              )}
            >
              <header className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2">
                <div className="flex items-center gap-2">
                  <span className={cx('h-2 w-2 rounded-full', etapa.id === 'ganho' ? 'bg-recebido' : etapa.id === 'perdido' ? 'bg-prata-4' : etapa.id === 'novo' ? 'bg-[#a9baff]' : 'bg-prata-2')} />
                  <h2 className="text-sm font-semibold text-platina">{etapa.nome}</h2>
                  <span className="rounded-full bg-white/[0.06] px-2 text-[11px] text-prata-2 tabular">{lista.length}</span>
                </div>
                {total > 0 && <span className="text-[11px] text-prata-3 tabular">{moeda(total)}</span>}
              </header>
              <div className="flex flex-1 flex-col gap-2 px-2.5 pb-3 overflow-y-auto" data-coluna={etapa.id}>
                <AnimatePresence initial={false}>
                  {lista.map((lead) => (
                    <CartaoLead
                      key={lead.id}
                      lead={lead}
                      compacto
                      nomeVendedor={nomesVendedores?.[lead.vendedorId]}
                      layout
                      drag={!final || true}
                      dragListener={!toqueGrosso}
                      dragSnapToOrigin
                      dragElastic={0.12}
                      dragMomentum={false}
                      dragTransition={{ bounceStiffness: 500, bounceDamping: 32 }}
                      whileDrag={reduzir ? undefined : { rotate: 2.5, scale: 1.04, zIndex: 50, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.14)' }}
                      onDragStart={() => setArrastando(lead.id)}
                      onDrag={aoArrastar}
                      onDragEnd={(_, info) => aoSoltar(lead, info)}
                      onClick={() => {
                        if (arrastando) return
                        navegar(`/leads/${lead.id}`)
                      }}
                      className={cx('cursor-grab active:cursor-grabbing hover:border-white/[0.16]', arrastando === lead.id && 'opacity-95')}
                      style={{ touchAction: toqueGrosso ? 'pan-x pan-y' : 'none' }}
                      acoes={
                        <div className="flex items-center gap-0.5 -mr-1.5 -mt-1" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                          {toqueGrosso && (
                            <AlcaArrasto lead={lead} onMove={(etapaDestino) => void mover(lead, etapaDestino)} />
                          )}
                          <Menu
                            gatilho={
                              <button aria-label="Mais ações" className="h-8 w-8 rounded-[8px] text-prata-3 hover:text-platina hover:bg-white/[0.08] flex items-center justify-center cursor-pointer">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            }
                            itens={[
                              { rotulo: 'Ligar', icone: <Phone className="h-4 w-4" />, aoClicar: () => ligar(lead) },
                              { rotulo: 'WhatsApp', icone: <MessageCircle className="h-4 w-4" />, aoClicar: () => whatsapp(lead) },
                              ...ETAPAS_KANBAN.filter((e) => e.id !== lead.etapa).map((e) => ({
                                rotulo: `Mover para ${e.nome}`,
                                icone: <ArrowRightLeft className="h-4 w-4" />,
                                aoClicar: () => void mover(lead, e.id),
                                perigo: e.id === 'perdido',
                              })),
                            ]}
                          />
                        </div>
                      }
                    />
                  ))}
                </AnimatePresence>
                {lista.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-white/[0.08] py-8 text-xs text-prata-3">
                    {ehAlvo ? 'Solte aqui' : 'Vazio'}
                  </div>
                )}
              </div>
            </motion.section>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

/** No celular, o arraste começa pela alça (para não brigar com a rolagem). */
function AlcaArrasto({ lead, onMove }: { lead: Lead; onMove: (e: Etapa) => void }) {
  return (
    <Menu
      gatilho={
        <button aria-label="Mover" className="h-8 w-8 rounded-[8px] text-prata-3 hover:text-platina hover:bg-white/[0.08] flex items-center justify-center cursor-pointer">
          <GripVertical className="h-4 w-4" />
        </button>
      }
      itens={ETAPAS_KANBAN.filter((e) => e.id !== lead.etapa).map((e) => ({ rotulo: e.nome, aoClicar: () => onMove(e.id), perigo: e.id === 'perdido' }))}
    />
  )
}

export function ordenarPorProximaAcao(a: Lead, b: Lead): number {
  const pa = a.proximaAcao?.dataHora ?? '9999'
  const pb = b.proximaAcao?.dataHora ?? '9999'
  if (pa !== pb) return pa.localeCompare(pb)
  if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1
  return (b.atualizadoEm ?? '').localeCompare(a.atualizadoEm ?? '')
}

export function useToqueGrosso(): boolean {
  const [grosso, setGrosso] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(pointer: coarse)').matches : false))
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const f = () => setGrosso(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return grosso
}

export { Botao as _BotaoKanban }
