import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Phone, MessageCircle, CheckCircle2, Clock, RefreshCw, Volume2, Square, Send, Sparkles, AlertTriangle, CalendarClock, Building2, Wallet, Target, ArrowRight } from 'lucide-react'
import { Botao, Cartao, Esqueleto, Etiqueta, NumeroAnimado, AnelProgresso, useToast, cx } from '@/components/ui'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { hojeISO, mesAtual, saudacao, atalhoProximaAcao, isoLocal } from '@/lib/datas'
import { moeda, primeiroNome, hora } from '@/lib/formatos'
import { montarDados, instrucaoSistema, promptBriefing, promptChat, textoLocal, type ItemDia, type DadosBriefing } from '@/lib/briefing'
import { geminiDisponivel, gerarComStreaming, type MensagemChat } from '@/lib/gemini'
import { cascata, itemCascata, EASE } from '@/lib/motion'
import type { Lead, Parcela } from '@/lib/tipos'
import { useLeadsTempoReal, atualizarLead } from '@/features/leads/dados'
import { ModalInteracao } from '@/features/leads/ModalInteracao'
import { useAcoesLead } from '@/features/leads/acoesLead'
import { useParcelasPendentes, useParcelasRecebidasMes, useVendasMes } from '@/features/vendas/dados'
import { ModalRecebimento } from '@/features/vendas/ModalRecebimento'
import { useMeta, publicarResumo } from '@/features/metas/dados'
import { recebidoNoMes, vendidoNoMes } from '@/lib/comissao'
import { lerBriefing, salvarBriefing } from './dados'
import { useVoz } from './useVoz'

export function PaginaInicio() {
  const usuario = useUsuario()
  const { veTudo, equipe, config } = useAuth()
  const navegar = useNavigate()
  const toast = useToast()
  const reduzir = useReducedMotion()
  const { ligar, whatsapp } = useAcoesLead()
  const voz = useVoz()

  const escopo = veTudo ? null : usuario.id
  const mes = mesAtual()
  const hoje = hojeISO()
  const leads = useLeadsTempoReal(escopo)
  const pendentes = useParcelasPendentes(escopo)
  const recebidas = useParcelasRecebidasMes(mes, escopo)
  const vendas = useVendasMes(mes, escopo)
  const metaPropria = useMeta(usuario.id, mes, usuario.metaMensalRecebido)
  const metaTime = useMemo(() => equipe.filter((u) => u.ativo && u.papel === 'vendedor').reduce((s, u) => s + (u.metaMensalRecebido ?? 0), 0), [equipe])
  const meta = veTudo ? metaTime || metaPropria.meta : metaPropria.meta

  const carregando = leads.carregando || pendentes.carregando || recebidas.carregando || vendas.carregando
  const pronto = !carregando

  const { dados, itens } = useMemo(
    () =>
      montarDados({
        usuario,
        escopo: veTudo ? 'time' : 'vendedor',
        leads: leads.dados,
        parcelasPendentes: pendentes.dados,
        parcelasRecebidasMes: recebidas.dados,
        vendasMes: vendas.dados,
        meta,
        sabadoUtil: config.geral.sabadoUtil,
      }),
    [usuario, veTudo, leads.dados, pendentes.dados, recebidas.dados, vendas.dados, meta, config.geral.sabadoUtil],
  )

  // Publica o resumo do vendedor para o ranking do time.
  useEffect(() => {
    if (!pronto || veTudo) return
    void publicarResumo(mes, usuario.id, {
      nome: usuario.nome,
      recebido: recebidoNoMes(recebidas.dados, mes),
      vendido: vendidoNoMes(vendas.dados, mes),
      contratos: vendas.dados.filter((v) => v.status === 'ativa').length,
    })
  }, [pronto, veTudo, mes, usuario.id, usuario.nome, recebidas.dados, vendas.dados])

  // Briefing do dia: lê o salvo; se não houver, gera e salva.
  const [texto, setTexto] = useState('')
  const [gerando, setGerando] = useState(false)
  const [origem, setOrigem] = useState<'gemini' | 'local' | null>(null)
  const geradoRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const gerar = useCallback(
    async (d: DadosBriefing, forcar: boolean) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setGerando(true)
      try {
        if (!forcar) {
          const salvo = await lerBriefing(usuario.id, hoje).catch(() => null)
          if (salvo?.texto) {
            setTexto(salvo.texto)
            setOrigem(salvo.origem ?? 'gemini')
            return
          }
        }
        let final = ''
        let org: 'gemini' | 'local' = 'local'
        if (geminiDisponivel()) {
          try {
            setTexto('')
            final = await gerarComStreaming(instrucaoSistema(config.geral.nomeAssistente), [{ papel: 'usuario', texto: promptBriefing(d) }], (acum) => setTexto(acum), ctrl.signal)
            org = 'gemini'
          } catch (e) {
            if (ctrl.signal.aborted) return
            console.warn('Gemini indisponível, usando texto local', e)
          }
        }
        if (!final) {
          final = textoLocal(d)
          org = 'local'
          setTexto(final)
        }
        setOrigem(org)
        await salvarBriefing({ vendedorId: usuario.id, data: hoje, texto: final, geradoEm: new Date().toISOString(), origem: org, dadosResumo: { ...d.meta, acoesHoje: d.acoesHoje.length, atrasados: d.followUpsAtrasados.length, parcelasAtrasadas: d.parcelasAtrasadas.length } }).catch(() => undefined)
      } finally {
        if (!ctrl.signal.aborted) setGerando(false)
      }
    },
    [usuario.id, hoje, config.geral.nomeAssistente],
  )

  useEffect(() => {
    if (!pronto || geradoRef.current) return
    geradoRef.current = true
    void gerar(dados, false)
  }, [pronto, dados, gerar])

  useEffect(() => () => abortRef.current?.abort(), [])

  // Ações da lista do dia
  const [leadInteracao, setLeadInteracao] = useState<Lead | null>(null)
  const [parcelaSel, setParcelaSel] = useState<Parcela | null>(null)

  async function adiar(l: Lead) {
    try {
      await atualizarLead(l.id, { proximaAcao: { tipo: l.proximaAcao?.tipo ?? 'ligacao', dataHora: isoLocal(atalhoProximaAcao('amanha9')), descricao: l.proximaAcao?.descricao } })
      toast.info('Adiado para amanhã às 9h')
    } catch {
      toast.erro('Não foi possível adiar')
    }
  }

  const grupos = useMemo(() => {
    const g: { titulo: string; icone: typeof Clock; tom: 'acento' | 'atrasado' | 'neutro' | 'recebido'; itens: ItemDia[] }[] = [
      { titulo: 'Agenda de hoje', icone: CalendarClock, tom: 'acento', itens: itens.filter((i) => i.tipo === 'acao_hoje') },
      { titulo: 'Cobranças', icone: Wallet, tom: 'atrasado', itens: itens.filter((i) => i.tipo === 'parcela_atrasada' || i.tipo === 'parcela_hoje') },
      { titulo: 'Follow-ups atrasados', icone: AlertTriangle, tom: 'atrasado', itens: itens.filter((i) => i.tipo === 'acao_atrasada') },
      { titulo: 'Sem contato há 3 dias ou mais', icone: Clock, tom: 'neutro', itens: itens.filter((i) => i.tipo === 'sem_contato').slice(0, 12) },
      { titulo: 'A receber nesta semana', icone: Wallet, tom: 'recebido', itens: itens.filter((i) => i.tipo === 'parcela_semana') },
    ]
    return g.filter((x) => x.itens.length > 0)
  }, [itens])

  const nome = primeiroNome(usuario.nome)

  return (
    <motion.div variants={cascata(0.05, 0.09)} initial="oculto" animate="visivel" className="flex flex-col gap-6">
      <motion.header variants={itemCascata}>
        <h1 className="text-[28px] md:text-[34px] font-semibold tracking-tight leading-tight">
          <span className="texto-prata">
            {saudacao()}, {nome}.
          </span>
        </h1>
        <p className="mt-1 text-sm text-prata-2">
          {veTudo ? 'Visão do time comercial' : 'Sua extensão de vendas'} · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
      </motion.header>

      <motion.div variants={itemCascata} className="relative">
        <motion.div
          aria-hidden
          initial={reduzir ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.25 }}
          className="pointer-events-none absolute -inset-x-6 -inset-y-10 -z-10 rounded-[40px] bg-[radial-gradient(60%_70%_at_30%_20%,rgba(91,124,255,0.22),transparent_65%),radial-gradient(50%_60%_at_80%_80%,rgba(138,92,246,0.16),transparent_60%)] blur-2xl"
        />
        <Cartao forte raio="xl" className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5b7cff,#8a5cf6)] text-white shadow-[0_0_24px_-4px_rgba(107,124,255,0.8)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-platina">{config.geral.nomeAssistente}</p>
                <p className="text-[11px] text-prata-3">Briefing do dia{origem === 'local' ? ' · gerado localmente' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {voz.suportado && (
                <Botao tamanho="sm" variante="secundario" onClick={() => (voz.falando ? voz.parar() : voz.falar(texto))} disabled={!texto} icone={voz.falando ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-4 w-4" />}>
                  {voz.falando ? 'Parar' : 'Ouvir'}
                </Botao>
              )}
              <Botao tamanho="sm" variante="fantasma" onClick={() => void gerar(dados, true)} disabled={!pronto || gerando} icone={<RefreshCw className={cx('h-4 w-4', gerando && 'animate-spin')} />}>
                Atualizar
              </Botao>
            </div>
          </div>

          {!pronto || (gerando && !texto) ? (
            <div className="space-y-2.5" aria-busy>
              <Esqueleto className="h-4 w-11/12" />
              <Esqueleto className="h-4 w-10/12" />
              <Esqueleto className="h-4 w-9/12" />
              <Esqueleto className="h-4 w-7/12" />
            </div>
          ) : (
            <p className="text-[17px] sm:text-lg leading-relaxed text-platina/95 whitespace-pre-wrap">
              {texto}
              {gerando && <span className="ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-[#a9baff] animate-pulse" aria-hidden />}
            </p>
          )}

          {pronto && (
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Numero rotulo="Ações hoje" valor={dados.acoesHoje.length} />
              <Numero rotulo="Atrasados" valor={dados.followUpsAtrasados.length + dados.parcelasAtrasadas.length} tom={dados.followUpsAtrasados.length + dados.parcelasAtrasadas.length > 0 ? 'atrasado' : 'neutro'} />
              <Numero rotulo="A receber hoje" valor={dados.parcelasHoje.reduce((s, p) => s + p.valor, 0)} moeda />
              <Numero rotulo="PJ / frota abertos" valor={dados.oportunidadesPJ.length} tom="acento" />
            </div>
          )}
        </Cartao>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <motion.section variants={itemCascata} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-platina">Lista do dia</h2>
            <span className="text-xs text-prata-3">{itens.length} itens</span>
          </div>
          {!pronto ? (
            <div className="space-y-2">
              <Esqueleto className="h-16 w-full rounded-md" />
              <Esqueleto className="h-16 w-full rounded-md" />
              <Esqueleto className="h-16 w-full rounded-md" />
            </div>
          ) : grupos.length === 0 ? (
            <Cartao className="p-6 text-center" brilho={false}>
              <p className="text-sm font-semibold text-platina">Agenda livre</p>
              <p className="mt-1 text-sm text-prata-2">Cadastre um lead ou avance os contatos em aberto.</p>
              <Botao className="mt-4" variante="primario" onClick={() => navegar('/leads')} iconeDireita={<ArrowRight className="h-4 w-4" />}>
                Ir para leads
              </Botao>
            </Cartao>
          ) : (
            <motion.div variants={cascata(0.15, 0.07)} initial="oculto" animate="visivel" className="flex flex-col gap-4">
              {grupos.map((g) => (
                <div key={g.titulo} className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-medium text-prata-2">
                    <g.icone className="h-3.5 w-3.5" /> {g.titulo}
                    <span className="text-prata-3">· {g.itens.length}</span>
                  </h3>
                  <AnimatePresence initial={false}>
                    {g.itens.map((it) => (
                      <ItemLista
                        key={it.id}
                        item={it}
                        aoAbrir={() => (it.lead ? navegar(`/leads/${it.lead.id}`) : it.parcela ? navegar(`/vendas/${it.parcela.vendaId}`) : undefined)}
                        aoLigar={() => it.lead && ligar(it.lead)}
                        aoWhatsApp={() => it.lead && whatsapp(it.lead)}
                        aoConcluir={() => (it.lead ? setLeadInteracao(it.lead) : it.parcela ? setParcelaSel(it.parcela) : undefined)}
                        aoAdiar={it.lead ? () => void adiar(it.lead!) : undefined}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}
        </motion.section>

        <motion.aside variants={itemCascata} className="flex flex-col gap-4">
          <Cartao className="p-5 flex items-center gap-5">
            <AnelProgresso percentual={dados.meta.percentual} tamanho={120} espessura={9}>
              <span className="text-lg font-semibold text-platina tabular">{dados.meta.percentual}%</span>
              <span className="text-[10px] text-prata-3">da meta</span>
            </AnelProgresso>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs text-prata-2">
                <Target className="h-3.5 w-3.5" /> Recebido no mês
              </p>
              <p className="text-2xl font-semibold text-[#7ad7b3] tabular leading-tight">
                <NumeroAnimado valor={dados.meta.recebido} formatar={moeda} />
              </p>
              <p className="mt-1 text-xs text-prata-3">
                Meta {moeda(dados.meta.valor)}. {dados.meta.falta > 0 ? `Faltam ${moeda(dados.meta.falta)}, ${moeda(dados.meta.porDiaUtil)} por dia útil.` : 'Meta batida.'}
              </p>
              <Botao className="mt-3" tamanho="sm" variante="fantasma" onClick={() => navegar('/metas')} iconeDireita={<ArrowRight className="h-4 w-4" />}>
                Ver metas
              </Botao>
            </div>
          </Cartao>

          <ChatAssistente dados={dados} pronto={pronto} nomeAssistente={config.geral.nomeAssistente} />
        </motion.aside>
      </div>

      <ModalInteracao lead={leadInteracao} aberto={!!leadInteracao} tipoInicial={leadInteracao?.proximaAcao?.tipo === 'whatsapp' ? 'whatsapp' : 'ligacao'} aoFechar={() => setLeadInteracao(null)} />
      <ModalRecebimento parcela={parcelaSel} aberto={!!parcelaSel} aoFechar={() => setParcelaSel(null)} aoSalvar={() => void Promise.all([pendentes.recarregar(), recebidas.recarregar()])} />
    </motion.div>
  )
}

function Numero({ rotulo, valor, tom = 'neutro', moeda: ehMoeda }: { rotulo: string; valor: number; tom?: 'neutro' | 'acento' | 'atrasado'; moeda?: boolean }) {
  const cor = { neutro: 'text-platina', acento: 'texto-acento', atrasado: 'text-[#f0c27a]' }[tom]
  return (
    <div className="rounded-md bg-white/[0.03] border border-white/[0.06] px-3.5 py-3">
      <p className="text-[11px] text-prata-3">{rotulo}</p>
      <p className={cx('text-xl font-semibold tabular leading-tight', cor)}>
        <NumeroAnimado valor={valor} formatar={(n) => (ehMoeda ? moeda(n) : String(Math.round(n)))} />
      </p>
    </div>
  )
}

function ItemLista({ item, aoAbrir, aoLigar, aoWhatsApp, aoConcluir, aoAdiar }: { item: ItemDia; aoAbrir: () => void; aoLigar: () => void; aoWhatsApp: () => void; aoConcluir: () => void; aoAdiar?: () => void }) {
  const ehParcela = !!item.parcela
  const tom = item.tipo === 'acao_atrasada' || item.tipo === 'parcela_atrasada' ? 'atrasado' : item.tipo === 'acao_hoje' ? 'acento' : 'neutro'
  return (
    <motion.div layout variants={itemCascata} exit={{ opacity: 0, y: -6 }} className={cx('vidro rounded-md p-3.5 flex flex-col gap-2.5', tom === 'atrasado' && 'border-l-2 border-l-atrasado/70', tom === 'acento' && 'border-l-2 border-l-acento/70')}>
      <button onClick={aoAbrir} className="text-left cursor-pointer min-w-0">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-platina">
          <span className="truncate">{item.titulo}</span>
          {item.prioridade && (
            <Etiqueta tom="acento">
              <Building2 className="h-3 w-3" /> PJ
            </Etiqueta>
          )}
        </p>
        <p className="text-xs text-prata-2 mt-0.5">
          {item.quando ? `${hora(item.quando)} · ` : ''}
          {item.subtitulo}
          {item.valor ? ` · ${moeda(item.valor)}` : ''}
        </p>
      </button>
      <div className="flex flex-wrap gap-1.5">
        {!ehParcela && (
          <>
            <Botao tamanho="sm" variante="secundario" onClick={aoLigar} icone={<Phone className="h-3.5 w-3.5" />}>
              Ligar
            </Botao>
            <Botao tamanho="sm" variante="secundario" onClick={aoWhatsApp} icone={<MessageCircle className="h-3.5 w-3.5" />}>
              WhatsApp
            </Botao>
          </>
        )}
        <Botao tamanho="sm" variante={ehParcela ? 'sucesso' : 'primario'} onClick={aoConcluir} icone={<CheckCircle2 className="h-3.5 w-3.5" />}>
          {ehParcela ? 'Marcar como recebido' : 'Concluir'}
        </Botao>
        {aoAdiar && (
          <Botao tamanho="sm" variante="fantasma" onClick={aoAdiar} icone={<Clock className="h-3.5 w-3.5" />}>
            Adiar
          </Botao>
        )}
      </div>
    </motion.div>
  )
}

const ATALHOS = ['Quem devo ligar agora?', 'Quanto falta para a meta?', 'O que está atrasado?', 'Resuma as oportunidades PJ']

function ChatAssistente({ dados, pronto, nomeAssistente }: { dados: DadosBriefing; pronto: boolean; nomeAssistente: string }) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>([])
  const [entrada, setEntrada] = useState('')
  const [respondendo, setRespondendo] = useState(false)
  const fimRef = useRef<HTMLDivElement>(null)
  const disponivel = geminiDisponivel()

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [mensagens])

  async function enviar(pergunta: string) {
    const p = pergunta.trim()
    if (!p || respondendo || !pronto) return
    setEntrada('')
    const historico: MensagemChat[] = [...mensagens, { papel: 'usuario', texto: p }]
    setMensagens([...historico, { papel: 'assistente', texto: '' }])
    setRespondendo(true)
    try {
      if (!disponivel) {
        const local = respostaLocal(p, dados)
        setMensagens([...historico, { papel: 'assistente', texto: local }])
        return
      }
      await gerarComStreaming(promptChat(dados, nomeAssistente), historico.slice(-8), (acum) => setMensagens([...historico, { papel: 'assistente', texto: acum }]))
    } catch (e) {
      console.error(e)
      setMensagens([...historico, { papel: 'assistente', texto: 'Não consegui responder agora. Tente de novo em instantes.' }])
    } finally {
      setRespondendo(false)
    }
  }

  return (
    <Cartao className="p-4 flex flex-col gap-3" brilho={false}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-platina">Pergunte ao {nomeAssistente}</h2>
        {!disponivel && <span className="text-[11px] text-prata-3">Modo local</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ATALHOS.map((a) => (
          <button key={a} onClick={() => void enviar(a)} disabled={respondendo || !pronto} className="h-8 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-xs text-prata-2 hover:text-platina hover:bg-white/[0.06] disabled:opacity-50 cursor-pointer">
            {a}
          </button>
        ))}
      </div>
      {mensagens.length > 0 && (
        <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
          {mensagens.map((m, i) => (
            <div key={i} className={cx('max-w-[92%] rounded-md px-3 py-2 text-sm whitespace-pre-wrap', m.papel === 'usuario' ? 'self-end bg-acento/15 text-platina border border-acento/25' : 'self-start bg-white/[0.04] text-prata border border-white/[0.06]')}>
              {m.texto || <span className="inline-block h-4 w-1.5 bg-[#a9baff] animate-pulse rounded-sm" />}
            </div>
          ))}
          <div ref={fimRef} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void enviar(entrada)
        }}
        className="flex gap-2"
      >
        <input aria-label="Pergunta ao assistente" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="Pergunte sobre sua agenda, cobranças ou meta" className="h-11 flex-1 rounded-sm bg-white/[0.04] border border-white/[0.09] px-3.5 text-sm text-platina placeholder:text-prata-3 focus:border-acento/70 focus:outline-none" disabled={!pronto} />
        <Botao type="submit" tamanho="icone" variante="primario" aria-label="Enviar" carregando={respondendo} disabled={!entrada.trim() || !pronto} icone={<Send className="h-4 w-4" />} />
      </form>
    </Cartao>
  )
}

/** Respostas locais simples quando não há chave do Gemini. */
function respostaLocal(pergunta: string, d: DadosBriefing): string {
  const p = pergunta.toLowerCase()
  if (/meta/.test(p)) {
    if (d.meta.valor <= 0) return 'Não tenho esse dado: a meta do mês não está definida.'
    return d.meta.falta > 0 ? `Faltam ${moeda(d.meta.falta)} para a meta de ${moeda(d.meta.valor)} (${d.meta.percentual}%). Ritmo necessário: ${moeda(d.meta.porDiaUtil)} por dia útil nos ${d.meta.diasUteisRestantes} dias úteis restantes.` : `Meta batida: ${moeda(d.meta.recebido)} de ${moeda(d.meta.valor)}.`
  }
  if (/ligar|agora|primeiro/.test(p)) {
    const proxima = d.acoesHoje[0]
    if (proxima) return `Ligue para ${proxima.lead} às ${proxima.hora}${proxima.descricao ? ` (${proxima.descricao})` : ''}. Depois: ${d.acoesHoje.slice(1, 4).map((a) => `${a.lead} às ${a.hora}`).join('; ') || 'nada mais agendado para hoje'}.`
    if (d.followUpsAtrasados[0]) return `Sem ações agendadas para hoje. Comece pelos follow-ups atrasados: ${d.followUpsAtrasados.slice(0, 3).map((f) => f.lead).join('; ')}.`
    return 'Não há ligações agendadas nem follow-ups atrasados. Avance os leads sem contato ou cadastre novos.'
  }
  if (/atras/.test(p)) {
    const partes: string[] = []
    if (d.parcelasAtrasadas.length) partes.push(`Parcelas atrasadas: ${d.parcelasAtrasadas.map((x) => `${moeda(x.valor)} de ${x.cliente} (${x.diasAtraso} dias)`).join('; ')}.`)
    if (d.followUpsAtrasados.length) partes.push(`Follow-ups atrasados: ${d.followUpsAtrasados.map((f) => `${f.lead} desde ${f.desde}`).join('; ')}.`)
    return partes.join(' ') || 'Nada atrasado.'
  }
  if (/pj|frota|oportunidade/.test(p)) {
    return d.oportunidadesPJ.length ? `Oportunidades PJ/frota: ${d.oportunidadesPJ.map((o) => `${o.lead} (${o.etapa.toLowerCase()}${o.valorEstimado ? `, ${moeda(o.valorEstimado)}` : ''})`).join('; ')}.` : 'Não há oportunidades PJ ou frota em aberto.'
  }
  if (/receb|cobr|parcela/.test(p)) {
    const hojeTxt = d.parcelasHoje.length ? `Hoje: ${d.parcelasHoje.map((x) => `${moeda(x.valor)} de ${x.cliente}`).join('; ')}.` : 'Nada vence hoje.'
    const semana = d.parcelasSemana.length ? ` Nesta semana: ${d.parcelasSemana.map((x) => `${moeda(x.valor)} de ${x.cliente} em ${x.vencimento}`).join('; ')}.` : ''
    return hojeTxt + semana
  }
  return `Não tenho esse dado. Posso responder sobre agenda, follow-ups, cobranças e meta. Ative a chave do Gemini para perguntas livres. Resumo: ${textoLocal(d)}`
}
