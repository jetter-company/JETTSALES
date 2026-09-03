// Monta o JSON compacto do dia a partir dos documentos do vendedor e produz:
//  - o prompt do Gemini (briefing de 4 a 7 frases, sem inventar nada);
//  - um texto determinístico de reserva, usado sem chave ou quando a API falhar.

import { diasDesde, ehAntesDeHoje, ehHoje, ehPassado, estaNestaSemana, hojeISO, mesAtual } from './datas'
import { moeda, hora, data as fmtData, primeiroNome } from './formatos'
import { ritmoMeta, statusParcela, vendidoNoMes, recebidoNoMes } from './comissao'
import type { Lead, Parcela, Usuario, Venda } from './tipos'
import { ETAPAS_ABERTAS } from './tipos'

export interface ItemDia {
  id: string
  tipo: 'acao_hoje' | 'acao_atrasada' | 'sem_contato' | 'parcela_hoje' | 'parcela_semana' | 'parcela_atrasada'
  titulo: string
  subtitulo: string
  quando?: string
  lead?: Lead
  parcela?: Parcela
  prioridade: boolean
  valor?: number
}

export interface DadosBriefing {
  data: string
  vendedor: string
  escopo: 'vendedor' | 'time'
  acoesHoje: { lead: string; hora: string; tipo: string; descricao?: string; pj: boolean }[]
  followUpsAtrasados: { lead: string; desde: string; pj: boolean }[]
  semContato3Dias: { lead: string; dias: number; etapa: string; pj: boolean }[]
  parcelasHoje: { cliente: string; valor: number }[]
  parcelasSemana: { cliente: string; valor: number; vencimento: string }[]
  parcelasAtrasadas: { cliente: string; valor: number; vencimento: string; diasAtraso: number }[]
  meta: { valor: number; recebido: number; falta: number; percentual: number; diasUteisRestantes: number; porDiaUtil: number }
  vendidoMes: number
  oportunidadesPJ: { lead: string; etapa: string; valorEstimado?: number }[]
  totais: { leadsAbertos: number; parcelasAtrasadas: number; valorAtrasado: number }
}

const NOME_ETAPA: Record<string, string> = {
  novo: 'Novo',
  contato_feito: 'Contato feito',
  qualificado: 'Qualificado',
  proposta_enviada: 'Proposta enviada',
  negociacao: 'Negociação',
  ganho: 'Ganho',
  perdido: 'Perdido',
}

const NOME_TIPO_ACAO: Record<string, string> = {
  ligacao: 'Ligar',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  reuniao: 'Reunião',
  cobranca: 'Cobrar',
  outro: 'Ação',
}

export interface EntradaBriefing {
  usuario: Usuario
  escopo: 'vendedor' | 'time'
  leads: Lead[]
  parcelasPendentes: Parcela[]
  parcelasRecebidasMes: Parcela[]
  vendasMes: Venda[]
  meta: number
  sabadoUtil: boolean
  agora?: Date
}

export function montarDados(e: EntradaBriefing): { dados: DadosBriefing; itens: ItemDia[] } {
  const agora = e.agora ?? new Date()
  const hoje = hojeISO(agora)
  const mes = mesAtual(agora)
  const abertos = e.leads.filter((l) => ETAPAS_ABERTAS.includes(l.etapa))
  const itens: ItemDia[] = []

  const acoesHoje = abertos
    .filter((l) => l.proximaAcao && ehHoje(l.proximaAcao.dataHora, agora))
    .sort((a, b) => (a.proximaAcao?.dataHora ?? '').localeCompare(b.proximaAcao?.dataHora ?? ''))
  for (const l of acoesHoje) {
    itens.push({
      id: `acao:${l.id}`,
      tipo: 'acao_hoje',
      titulo: `${NOME_TIPO_ACAO[l.proximaAcao?.tipo ?? 'outro']}: ${l.nome}`,
      subtitulo: l.proximaAcao?.descricao || `${NOME_ETAPA[l.etapa]}${l.empresa ? ` · ${l.empresa}` : ''}`,
      quando: l.proximaAcao?.dataHora,
      lead: l,
      prioridade: l.prioridade,
    })
  }

  const atrasados = abertos
    .filter((l) => l.proximaAcao && ehAntesDeHoje(l.proximaAcao.dataHora, agora))
    .sort((a, b) => (a.proximaAcao?.dataHora ?? '').localeCompare(b.proximaAcao?.dataHora ?? ''))
  for (const l of atrasados) {
    itens.push({
      id: `atrasado:${l.id}`,
      tipo: 'acao_atrasada',
      titulo: `Follow-up atrasado: ${l.nome}`,
      subtitulo: `Era para ${fmtData(l.proximaAcao?.dataHora)} às ${hora(l.proximaAcao?.dataHora)}`,
      quando: l.proximaAcao?.dataHora,
      lead: l,
      prioridade: l.prioridade,
    })
  }

  const semContato = abertos
    .filter((l) => {
      if (l.proximaAcao && (ehHoje(l.proximaAcao.dataHora, agora) || ehAntesDeHoje(l.proximaAcao.dataHora, agora))) return false
      const ref = l.ultimoContatoEm ?? l.criadoEm
      const d = diasDesde(ref, agora)
      return d !== null && d >= 3
    })
    .map((l) => ({ l, dias: diasDesde(l.ultimoContatoEm ?? l.criadoEm, agora) ?? 0 }))
    .sort((a, b) => b.dias - a.dias)
  for (const { l, dias } of semContato) {
    itens.push({
      id: `semcontato:${l.id}`,
      tipo: 'sem_contato',
      titulo: `${l.nome} sem contato há ${dias} dias`,
      subtitulo: NOME_ETAPA[l.etapa] ?? l.etapa,
      lead: l,
      prioridade: l.prioridade,
    })
  }

  const pendentes = e.parcelasPendentes.filter((p) => p.status === 'previsto')
  const parcelasAtrasadas = pendentes.filter((p) => statusParcela(p, hoje) === 'atrasado')
  const parcelasHoje = pendentes.filter((p) => p.vencimento.slice(0, 10) === hoje)
  const parcelasSemana = pendentes.filter((p) => p.vencimento.slice(0, 10) > hoje && estaNestaSemana(p.vencimento, agora))

  for (const p of parcelasAtrasadas) {
    itens.push({
      id: `parcela:${p.id}`,
      tipo: 'parcela_atrasada',
      titulo: `Cobrar ${p.clienteNome}`,
      subtitulo: `Parcela ${p.numero || 'entrada'} venceu em ${fmtData(p.vencimento)}`,
      parcela: p,
      prioridade: false,
      valor: p.valor,
    })
  }
  for (const p of parcelasHoje) {
    itens.push({
      id: `parcela:${p.id}`,
      tipo: 'parcela_hoje',
      titulo: `Receber de ${p.clienteNome}`,
      subtitulo: `Parcela ${p.numero || 'entrada'} vence hoje`,
      parcela: p,
      prioridade: false,
      valor: p.valor,
    })
  }
  for (const p of parcelasSemana) {
    itens.push({
      id: `parcela:${p.id}`,
      tipo: 'parcela_semana',
      titulo: `Receber de ${p.clienteNome}`,
      subtitulo: `Parcela ${p.numero || 'entrada'} vence em ${fmtData(p.vencimento)}`,
      parcela: p,
      prioridade: false,
      valor: p.valor,
    })
  }

  const recebido = recebidoNoMes(e.parcelasRecebidasMes, mes)
  const vendido = vendidoNoMes(e.vendasMes, mes)
  const ritmo = ritmoMeta(e.meta, recebido, agora, e.sabadoUtil)

  const oportunidadesPJ = abertos
    .filter((l) => l.prioridade)
    .sort((a, b) => (b.valorEstimado ?? 0) - (a.valorEstimado ?? 0))
    .slice(0, 8)

  const dados: DadosBriefing = {
    data: hoje,
    vendedor: primeiroNome(e.usuario.nome),
    escopo: e.escopo,
    acoesHoje: acoesHoje.map((l) => ({
      lead: rotuloLead(l),
      hora: hora(l.proximaAcao?.dataHora),
      tipo: NOME_TIPO_ACAO[l.proximaAcao?.tipo ?? 'outro'] ?? 'Ação',
      descricao: l.proximaAcao?.descricao || undefined,
      pj: l.tipoPessoa === 'PJ',
    })),
    followUpsAtrasados: atrasados.slice(0, 10).map((l) => ({ lead: rotuloLead(l), desde: fmtData(l.proximaAcao?.dataHora), pj: l.tipoPessoa === 'PJ' })),
    semContato3Dias: semContato.slice(0, 10).map(({ l, dias }) => ({ lead: rotuloLead(l), dias, etapa: NOME_ETAPA[l.etapa] ?? l.etapa, pj: l.tipoPessoa === 'PJ' })),
    parcelasHoje: parcelasHoje.map((p) => ({ cliente: p.clienteNome, valor: p.valor })),
    parcelasSemana: parcelasSemana.slice(0, 10).map((p) => ({ cliente: p.clienteNome, valor: p.valor, vencimento: fmtData(p.vencimento) })),
    parcelasAtrasadas: parcelasAtrasadas.slice(0, 10).map((p) => ({
      cliente: p.clienteNome,
      valor: p.valor,
      vencimento: fmtData(p.vencimento),
      diasAtraso: Math.max(0, diasDesde(p.vencimento, agora) ?? 0),
    })),
    meta: {
      valor: e.meta,
      recebido,
      falta: ritmo.falta,
      percentual: Math.round(ritmo.percentual),
      diasUteisRestantes: ritmo.diasUteisRestantes,
      porDiaUtil: ritmo.porDiaUtil,
    },
    vendidoMes: vendido,
    oportunidadesPJ: oportunidadesPJ.map((l) => ({ lead: rotuloLead(l), etapa: NOME_ETAPA[l.etapa] ?? l.etapa, valorEstimado: l.valorEstimado })),
    totais: {
      leadsAbertos: abertos.length,
      parcelasAtrasadas: parcelasAtrasadas.length,
      valorAtrasado: parcelasAtrasadas.reduce((s, p) => s + p.valor, 0),
    },
  }

  return { dados, itens }
}

function rotuloLead(l: Lead): string {
  return l.empresa ? `${l.nome} (${l.empresa})` : l.nome
}

export function instrucaoSistema(nomeAssistente: string, escritorio = 'Pedrini & Azevedo Advogados Associados'): string {
  return [
    `Você é ${nomeAssistente}, o assistente executivo pessoal da equipe comercial do escritório ${escritorio} (Foz do Iguaçu/PR), que atua na liberação e restituição de veículos apreendidos pela Receita Federal, PRF e BPFron.`,
    'Fale em português do Brasil, com frases curtas, verbos ativos e tom de assistente executivo: direto, motivador sem exagero.',
    'Regras absolutas:',
    '1. Use apenas os dados do JSON fornecido. Nunca invente nomes, valores, horários ou fatos. Se não houver dado, diga "não tenho esse dado".',
    '2. Nunca prometa resultado jurídico, nunca comente o mérito de casos e nunca dê orientação jurídica. Fale só de agenda, follow-up, cobrança e meta.',
    '3. Cite nomes, horários e valores explicitamente (exemplo: "Hoje: ligar para Transportes X às 10h; receber R$ 4.500 de Y").',
    '4. Dinheiro no formato R$ 1.234,56. Horas no formato 24h. Sem travessão, sem markdown, sem listas com marcadores, sem emojis.',
    '5. Leads PJ e frotas têm prioridade: mencione-os primeiro quando existirem.',
  ].join('\n')
}

export function promptBriefing(d: DadosBriefing): string {
  return [
    `Gere o briefing do dia para ${d.vendedor} (${d.escopo === 'time' ? 'visão do time comercial' : 'visão individual'}).`,
    'Escreva de 4 a 7 frases em um único parágrafo, sem título e sem saudação (a saudação já aparece na tela).',
    'Ordem sugerida: prioridades de hoje (ações agendadas e cobranças), follow-ups atrasados e leads sem contato, parcelas da semana, situação da meta com o ritmo por dia útil, oportunidades PJ/frota.',
    'Se uma lista estiver vazia, não a mencione. Se tudo estiver vazio, diga que a agenda está livre e sugira cadastrar ou contatar leads.',
    `Dados (JSON): ${JSON.stringify(d)}`,
  ].join('\n')
}

export function promptChat(d: DadosBriefing, nomeAssistente: string): string {
  return [
    `${instrucaoSistema(nomeAssistente)}`,
    'Responda perguntas sobre os dados abaixo com no máximo 5 frases. Quando o usuário pedir uma lista, use frases separadas por ponto e vírgula, sem marcadores.',
    `Dados de hoje (JSON): ${JSON.stringify(d)}`,
  ].join('\n')
}

/** Texto determinístico, sem IA, com o mesmo conteúdo. */
export function textoLocal(d: DadosBriefing): string {
  const frases: string[] = []
  const lista = (itens: string[]) => itens.join('; ')

  if (d.acoesHoje.length) {
    frases.push(`Hoje: ${lista(d.acoesHoje.map((a) => `${a.tipo.toLowerCase()} para ${a.lead} às ${a.hora}`))}.`)
  }
  if (d.parcelasHoje.length) {
    frases.push(`Receber hoje ${lista(d.parcelasHoje.map((p) => `${moeda(p.valor)} de ${p.cliente}`))}.`)
  }
  if (d.parcelasAtrasadas.length) {
    frases.push(
      `Cobrar ${d.parcelasAtrasadas.length === 1 ? 'a parcela atrasada' : `${d.parcelasAtrasadas.length} parcelas atrasadas`}: ${lista(d.parcelasAtrasadas.slice(0, 4).map((p) => `${moeda(p.valor)} de ${p.cliente} (${p.diasAtraso} dias)`))}.`,
    )
  }
  if (d.followUpsAtrasados.length) {
    frases.push(`Follow-ups atrasados: ${lista(d.followUpsAtrasados.slice(0, 5).map((f) => `${f.lead} desde ${f.desde}`))}.`)
  }
  if (d.semContato3Dias.length) {
    frases.push(`Sem contato há 3 dias ou mais: ${lista(d.semContato3Dias.slice(0, 5).map((s) => `${s.lead} (${s.dias} dias, ${s.etapa.toLowerCase()})`))}.`)
  }
  if (d.parcelasSemana.length) {
    frases.push(`Nesta semana vencem ${lista(d.parcelasSemana.slice(0, 4).map((p) => `${moeda(p.valor)} de ${p.cliente} em ${p.vencimento}`))}.`)
  }
  if (d.meta.valor > 0) {
    if (d.meta.falta <= 0) frases.push(`Meta do mês batida: ${moeda(d.meta.recebido)} recebidos de ${moeda(d.meta.valor)}.`)
    else
      frases.push(
        `Meta: ${moeda(d.meta.recebido)} recebidos de ${moeda(d.meta.valor)} (${d.meta.percentual}%); faltam ${moeda(d.meta.falta)}, ou ${moeda(d.meta.porDiaUtil)} por dia útil nos ${d.meta.diasUteisRestantes} dias úteis restantes.`,
      )
  }
  if (d.oportunidadesPJ.length) {
    frases.push(`Oportunidades PJ/frota em aberto: ${lista(d.oportunidadesPJ.slice(0, 4).map((o) => `${o.lead} (${o.etapa.toLowerCase()}${o.valorEstimado ? `, ${moeda(o.valorEstimado)}` : ''})`))}.`)
  }
  if (!frases.length) {
    return 'Agenda livre por enquanto. Cadastre novos leads ou avance os contatos em aberto para movimentar o funil.'
  }
  return frases.slice(0, 7).join(' ')
}

export function resumoParaChat(d: DadosBriefing): string {
  return JSON.stringify(d)
}

export { ehPassado }
