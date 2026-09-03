import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Phone, MessageCircle, Copy, Pencil, Trophy, XCircle, FileText, Clock, Mail, Users, StickyNote, Trash2, Building2, Truck, CalendarClock } from 'lucide-react'
import { Botao, Cartao, Etiqueta, EsqueletoCartao, Modal, Particulas, Selecao, Confirmacao, useToast, cx } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { itemCascata } from '@/lib/motion'
import { data as fmtData, dataHora, moeda, hora } from '@/lib/formatos'
import { formatarTelefone } from '@/lib/telefone'
import { ehAntesDeHoje, ehHoje, atalhoProximaAcao, isoLocal, paraInputDateTime, deInputDateTime } from '@/lib/datas'
import { ETAPAS, RESULTADOS_INTERACAO, TIPOS_INTERACAO, type Etapa, type Interacao, type Lead, type TipoInteracao, type TipoProximaAcao, type Venda } from '@/lib/tipos'
import { Entrada } from '@/components/ui'
import { atualizarLead, buscarLead, excluirLead, moverEtapa, useInteracoes } from './dados'
import { useAcoesLead, nomeOrgao, nomeVeiculo } from './acoesLead'
import { ModalInteracao } from './ModalInteracao'
import { ModalPerda } from './ModalPerda'
import { FichaRepasse } from './FichaRepasse'
import { FormularioLead } from './FormularioLead'
import { useVendasDoLead } from '@/features/vendas/hooksLead'

const ICONE_TIPO: Record<TipoInteracao, typeof Phone> = { ligacao: Phone, whatsapp: MessageCircle, email: Mail, reuniao: Users, anotacao: StickyNote }

export function PaginaLead() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const navegar = useNavigate()
  const usuario = useUsuario()
  const { veTudo, equipe } = useAuth()
  const toast = useToast()
  const { ligar, whatsapp, copiar } = useAcoesLead()
  const [lead, setLead] = useState<Lead | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [modalInteracao, setModalInteracao] = useState<TipoInteracao | null>(null)
  const [modalPerda, setModalPerda] = useState(false)
  const [modalRepasse, setModalRepasse] = useState(params.get('repasse') === '1')
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [confirmarExcluir, setConfirmarExcluir] = useState(false)
  const [celebrar, setCelebrar] = useState(false)
  const [modalProxima, setModalProxima] = useState(false)
  const interacoes = useInteracoes(id)
  const { dados: vendas } = useVendasDoLead(id, lead?.vendedorId ?? null)

  const recarregar = useCallback(async () => {
    try {
      const l = await buscarLead(id)
      setLead(l)
    } catch (e) {
      // Sem permissão (lead de outro vendedor) cai no estado "não encontrado", sem alarde.
      if ((e as { code?: string })?.code !== 'permission-denied') {
        console.error(e)
        toast.erro('Não foi possível abrir o lead')
      }
      setLead(null)
    } finally {
      setCarregando(false)
    }
  }, [id, toast])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  useEffect(() => {
    if (params.get('repasse') === '1') {
      setModalRepasse(true)
      params.delete('repasse')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const nomeVendedor = useMemo(() => equipe.find((u) => u.id === lead?.vendedorId)?.nome, [equipe, lead?.vendedorId])
  const venda: Venda | null = vendas[0] ?? null

  if (carregando) {
    return (
      <div className="space-y-4">
        <EsqueletoCartao linhas={2} />
        <EsqueletoCartao linhas={5} />
      </div>
    )
  }
  if (!lead) {
    return (
      <Pagina titulo="Lead não encontrado">
        <Botao variante="secundario" onClick={() => navegar('/leads')} icone={<ArrowLeft className="h-4 w-4" />}>
          Voltar para leads
        </Botao>
      </Pagina>
    )
  }

  const pa = lead.proximaAcao
  const atrasada = pa && ehAntesDeHoje(pa.dataHora)
  const hoje = pa && ehHoje(pa.dataHora)
  const fechado = lead.etapa === 'ganho' || lead.etapa === 'perdido'

  async function mudarEtapa(etapa: Etapa) {
    if (etapa === lead!.etapa) return
    if (etapa === 'perdido') return setModalPerda(true)
    if (etapa === 'ganho') return void ganhar()
    try {
      await moverEtapa(lead!.id, etapa)
      await recarregar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível mudar a etapa')
    }
  }

  async function ganhar() {
    try {
      await moverEtapa(lead!.id, 'ganho', { proximaAcao: null })
      setCelebrar(true)
      toast.sucesso('Lead ganho', 'Agora registre a venda.')
      setTimeout(() => navegar(`/vendas/nova?leadId=${lead!.id}`), 700)
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível marcar como ganho')
    }
  }

  async function salvarEdicao(dados: Parameters<typeof atualizarLead>[1]) {
    setSalvando(true)
    try {
      await atualizarLead(lead!.id, dados)
      toast.sucesso('Lead atualizado')
      setEditando(false)
      await recarregar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    try {
      await excluirLead(lead!.id)
      toast.info('Lead excluído')
      navegar('/leads', { replace: true })
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível excluir')
    }
  }

  return (
    <Pagina
      titulo={
        <span className="flex items-center gap-2">
          {lead.nome}
          {lead.prioridade && (
            <Etiqueta tom="acento">
              {lead.tipoPessoa === 'PJ' ? <Building2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
              {lead.tipoPessoa === 'PJ' ? 'PJ' : 'Frota'}
            </Etiqueta>
          )}
        </span>
      }
      subtitulo={[lead.empresa, [lead.cidade, lead.uf].filter(Boolean).join('/'), formatarTelefone(lead.telefone), veTudo && nomeVendedor ? `Vendedor: ${nomeVendedor}` : null].filter(Boolean).join(' · ')}
      acoes={
        <Botao variante="fantasma" tamanho="sm" onClick={() => navegar(-1)} icone={<ArrowLeft className="h-4 w-4" />}>
          Voltar
        </Botao>
      }
    >
      <Particulas ativo={celebrar} aoTerminar={() => setCelebrar(false)} />

      <motion.div variants={itemCascata} layoutId={`lead-${lead.id}`} className="vidro-2 rounded-xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Botao variante="primario" onClick={() => ligar(lead)} icone={<Phone className="h-4 w-4" />}>
            Ligar
          </Botao>
          <Botao variante="sucesso" onClick={() => whatsapp(lead)} icone={<MessageCircle className="h-4 w-4" />}>
            WhatsApp
          </Botao>
          <Botao variante="secundario" onClick={() => void copiar(lead)} icone={<Copy className="h-4 w-4" />}>
            Copiar dados
          </Botao>
          <Botao variante="secundario" onClick={() => setModalInteracao('ligacao')} icone={<Phone className="h-4 w-4" />}>
            Registrar ligação
          </Botao>
          <Botao variante="secundario" onClick={() => setModalInteracao('anotacao')} icone={<StickyNote className="h-4 w-4" />}>
            Anotar
          </Botao>
          <div className="ml-auto flex gap-2">
            <Botao variante="fantasma" onClick={() => setEditando(true)} icone={<Pencil className="h-4 w-4" />}>
              Editar
            </Botao>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-prata-2">Etapa</span>
            <div className="flex flex-wrap items-center gap-2">
              <Selecao aria-label="Etapa" className="w-56" opcoes={ETAPAS.map((e) => ({ valor: e.id, nome: e.nome }))} value={lead.etapa} onChange={(e) => void mudarEtapa(e.target.value as Etapa)} />
              {!fechado && (
                <>
                  <Botao variante="sucesso" tamanho="sm" onClick={() => void ganhar()} icone={<Trophy className="h-4 w-4" />}>
                    Ganho
                  </Botao>
                  <Botao variante="fantasma" tamanho="sm" onClick={() => setModalPerda(true)} icone={<XCircle className="h-4 w-4" />}>
                    Perdido
                  </Botao>
                </>
              )}
              {lead.etapa === 'ganho' && (
                <>
                  {!venda && (
                    <Botao variante="primario" tamanho="sm" onClick={() => navegar(`/vendas/nova?leadId=${lead.id}`)}>
                      Registrar venda
                    </Botao>
                  )}
                  <Botao variante="secundario" tamanho="sm" onClick={() => setModalRepasse(true)} icone={<FileText className="h-4 w-4" />}>
                    Ficha de repasse
                  </Botao>
                </>
              )}
            </div>
            {lead.etapa === 'perdido' && lead.motivoPerda && <p className="text-xs text-prata-3">Motivo: {lead.motivoPerda}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-prata-2">Próxima ação</span>
            <div className={cx('flex flex-wrap items-center gap-2 rounded-md border px-3 py-2', atrasada ? 'border-atrasado/40 bg-atrasado/10' : hoje ? 'border-acento/40 bg-acento/10' : 'border-white/[0.08] bg-white/[0.02]')}>
              <Clock className={cx('h-4 w-4', atrasada ? 'text-[#f0c27a]' : hoje ? 'text-[#a9baff]' : 'text-prata-3')} />
              <span className="text-sm text-platina flex-1 min-w-0">
                {pa ? `${dataHora(pa.dataHora)}${pa.descricao ? ` · ${pa.descricao}` : ''}` : fechado ? 'Nenhuma' : 'Sem próxima ação. Defina uma.'}
              </span>
              {!fechado && (
                <Botao tamanho="sm" variante="secundario" onClick={() => setModalProxima(true)} icone={<CalendarClock className="h-4 w-4" />}>
                  {pa ? 'Alterar' : 'Definir'}
                </Botao>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <motion.div variants={itemCascata} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-platina">Linha do tempo</h2>
            <div className="flex gap-1">
              {TIPOS_INTERACAO.map((t) => {
                const Icone = ICONE_TIPO[t.id]
                return <Botao key={t.id} tamanho="icone" variante="fantasma" aria-label={`Registrar ${t.nome.toLowerCase()}`} title={`Registrar ${t.nome.toLowerCase()}`} onClick={() => setModalInteracao(t.id)} icone={<Icone className="h-4 w-4" />} />
              })}
            </div>
          </div>
          {interacoes.carregando ? (
            <EsqueletoCartao linhas={3} />
          ) : interacoes.dados.length === 0 ? (
            <Cartao className="p-6 text-center text-sm text-prata-2" brilho={false}>
              Nenhuma interação ainda. Registre a primeira ligação ou anotação.
            </Cartao>
          ) : (
            <ol className="relative flex flex-col gap-2 pl-5 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-white/[0.08]">
              <AnimatePresence initial={false}>
                {interacoes.dados.map((i) => (
                  <ItemInteracao key={i.id} i={i} />
                ))}
              </AnimatePresence>
            </ol>
          )}
        </motion.div>

        <motion.div variants={itemCascata} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-platina">Detalhes</h2>
          <Cartao className="p-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm" brilho={false}>
            <Detalhe rotulo="Telefone" valor={formatarTelefone(lead.telefone)} />
            <Detalhe rotulo="E-mail" valor={lead.email} />
            <Detalhe rotulo="Origem" valor={lead.origem} />
            <Detalhe rotulo="Serviço" valor={lead.servicoInteresse} />
            <Detalhe rotulo="Órgão" valor={nomeOrgao(lead.orgao)} />
            <Detalhe rotulo="Veículo" valor={nomeVeiculo(lead.tipoVeiculo)} />
            <Detalhe rotulo="Apreensão" valor={lead.dataApreensao ? fmtData(lead.dataApreensao) : ''} />
            <Detalhe rotulo="Local" valor={lead.localApreensao} />
            <Detalhe rotulo="Carga" valor={lead.carga} />
            <Detalhe rotulo="Valor estimado" valor={lead.valorEstimado ? moeda(lead.valorEstimado) : ''} />
            <Detalhe rotulo="Auto de infração" valor={lead.autoInfracao ? 'Sim' : ''} />
            <Detalhe rotulo="Documentos" valor={lead.documentosEmMaos?.join(', ')} />
            <Detalhe rotulo="Último contato" valor={lead.ultimoContatoEm ? dataHora(lead.ultimoContatoEm) : ''} />
            <Detalhe rotulo="Criado em" valor={lead.criadoEm ? fmtData(lead.criadoEm) : ''} />
            {lead.observacoes && (
              <div className="col-span-2">
                <p className="text-xs text-prata-3">Observações</p>
                <p className="text-platina whitespace-pre-wrap">{lead.observacoes}</p>
              </div>
            )}
          </Cartao>
          {venda && (
            <Cartao className="p-5 text-sm flex flex-col gap-1" brilho={false}>
              <p className="text-xs text-prata-3">Contrato</p>
              <p className="text-platina font-semibold">
                {venda.servico} · {moeda(venda.valorTotal)}
              </p>
              <p className="text-prata-2">
                Entrada {moeda(venda.entrada)} · {venda.numParcelas}x · fechado em {fmtData(venda.dataFechamento)}
              </p>
              <Botao tamanho="sm" variante="secundario" className="mt-2 self-start" onClick={() => navegar(`/vendas/${venda.id}`)}>
                Ver parcelas
              </Botao>
            </Cartao>
          )}
          <Botao variante="fantasma" tamanho="sm" className="self-start text-[#ff8a8e]" onClick={() => setConfirmarExcluir(true)} icone={<Trash2 className="h-4 w-4" />}>
            Excluir lead
          </Botao>
        </motion.div>
      </div>

      <ModalInteracao lead={lead} aberto={modalInteracao !== null} tipoInicial={modalInteracao ?? 'ligacao'} aoFechar={() => setModalInteracao(null)} aoSalvar={() => void Promise.all([recarregar(), interacoes.recarregar()])} />
      <ModalPerda lead={lead} aberto={modalPerda} aoFechar={() => setModalPerda(false)} aoConcluir={() => void recarregar()} />
      <FichaRepasse lead={lead} venda={venda} aberto={modalRepasse} aoFechar={() => setModalRepasse(false)} nomeVendedor={usuario.nome} />
      <ModalProximaAcao lead={lead} aberto={modalProxima} aoFechar={() => setModalProxima(false)} aoSalvar={() => void recarregar()} />
      <Confirmacao aberto={confirmarExcluir} aoFechar={() => setConfirmarExcluir(false)} aoConfirmar={() => void excluir()} titulo="Excluir este lead?" descricao="A ação não pode ser desfeita. As interações também serão perdidas." textoConfirmar="Excluir" perigo />

      <Modal aberto={editando} aoFechar={() => setEditando(false)} titulo="Editar lead" largura="lg">
        <FormularioLead inicial={lead} leadId={lead.id} aoSalvar={salvarEdicao} salvando={salvando} textoBotao="Salvar alterações" />
      </Modal>
    </Pagina>
  )
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor?: string | null }) {
  if (!valor) return null
  return (
    <div className="min-w-0">
      <p className="text-xs text-prata-3">{rotulo}</p>
      <p className="text-platina truncate">{valor}</p>
    </div>
  )
}

function ItemInteracao({ i }: { i: Interacao }) {
  const Icone = ICONE_TIPO[i.tipo] ?? StickyNote
  const nomeTipo = TIPOS_INTERACAO.find((t) => t.id === i.tipo)?.nome ?? i.tipo
  const nomeResultado = RESULTADOS_INTERACAO.find((r) => r.id === i.resultado)?.nome
  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative">
      <span className="absolute -left-5 top-3 h-3.5 w-3.5 rounded-full border border-white/20 bg-fundo-1 flex items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-prata" />
      </span>
      <div className="vidro rounded-md px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Icone className="h-4 w-4 text-prata-2" />
          <span className="font-semibold text-platina">{nomeTipo}</span>
          {nomeResultado && <Etiqueta tom={i.resultado === 'atendeu' || i.resultado === 'retorno_agendado' ? 'recebido' : i.resultado === 'sem_interesse' ? 'erro' : 'neutro'}>{nomeResultado}</Etiqueta>}
          <span className="ml-auto text-xs text-prata-3 tabular">
            {fmtData(i.dataHora)} {hora(i.dataHora)}
            {i.duracaoMin ? ` · ${i.duracaoMin} min` : ''}
          </span>
        </div>
        {i.resumo && <p className="mt-1.5 text-sm text-prata whitespace-pre-wrap">{i.resumo}</p>}
      </div>
    </motion.li>
  )
}

function ModalProximaAcao({ lead, aberto, aoFechar, aoSalvar }: { lead: Lead; aberto: boolean; aoFechar: () => void; aoSalvar: () => void }) {
  const toast = useToast()
  const [quando, setQuando] = useState(paraInputDateTime(lead.proximaAcao?.dataHora))
  const [tipo, setTipo] = useState<TipoProximaAcao>(lead.proximaAcao?.tipo ?? 'ligacao')
  const [descricao, setDescricao] = useState(lead.proximaAcao?.descricao ?? '')
  const [salvando, setSalvando] = useState(false)
  useEffect(() => {
    if (aberto) {
      setQuando(paraInputDateTime(lead.proximaAcao?.dataHora))
      setTipo(lead.proximaAcao?.tipo ?? 'ligacao')
      setDescricao(lead.proximaAcao?.descricao ?? '')
    }
  }, [aberto, lead.proximaAcao])

  async function salvar(limpar = false) {
    setSalvando(true)
    try {
      await atualizarLead(lead.id, { proximaAcao: limpar || !quando ? null : { tipo, dataHora: deInputDateTime(quando), descricao: descricao.trim() || undefined } })
      toast.sucesso(limpar ? 'Próxima ação removida' : 'Próxima ação definida')
      aoSalvar()
      aoFechar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Próxima ação"
      largura="sm"
      rodape={
        <>
          {lead.proximaAcao && (
            <Botao variante="fantasma" onClick={() => void salvar(true)}>
              Remover
            </Botao>
          )}
          <Botao variante="primario" onClick={() => void salvar()} carregando={salvando} disabled={!quando}>
            Salvar próxima ação
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['em1hora', 'Em 1 hora'],
              ['hoje17', 'Hoje 17h'],
              ['amanha9', 'Amanhã 9h'],
              ['em3dias', 'Em 3 dias'],
            ] as const
          ).map(([k, nome]) => (
            <Botao key={k} tamanho="sm" onClick={() => setQuando(paraInputDateTime(isoLocal(atalhoProximaAcao(k))))}>
              {nome}
            </Botao>
          ))}
        </div>
        <Entrada rotulo="Data e hora" type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} />
        <Selecao
          rotulo="Tipo"
          opcoes={[
            { valor: 'ligacao', nome: 'Ligar' },
            { valor: 'whatsapp', nome: 'WhatsApp' },
            { valor: 'email', nome: 'E-mail' },
            { valor: 'reuniao', nome: 'Reunião' },
            { valor: 'cobranca', nome: 'Cobrar' },
            { valor: 'outro', nome: 'Outro' },
          ]}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoProximaAcao)}
        />
        <Entrada rotulo="Descrição curta" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={80} />
      </div>
    </Modal>
  )
}
