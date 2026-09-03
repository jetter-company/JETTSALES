// Dados de exemplo carregáveis pelo administrador (marcados com exemplo: true para
// poderem ser apagados depois). Nunca usados em produção sem essa ação explícita.

import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { gerarParcelas } from '@/lib/comissao'
import { hojeISO, isoLocal } from '@/lib/datas'
import type { Etapa, Lead, TipoVeiculo, Usuario } from '@/lib/tipos'

const NOMES_PF = ['Carlos Mendes', 'Juliana Prates', 'Rafael Souza', 'Marcos Antunes', 'Fernanda Lopes', 'Diego Ramos', 'Patrícia Nunes', 'Anderson Silva', 'Bruna Carvalho', 'Eduardo Farias']
const EMPRESAS = ['Transportes Iguaçu', 'Rodoviária Cataratas', 'Frota Oeste Logística', 'Viação Três Fronteiras', 'Cargas Paraná Sul', 'Expresso Foz']
const CIDADES: [string, string][] = [
  ['Foz do Iguaçu', 'PR'],
  ['Cascavel', 'PR'],
  ['Curitiba', 'PR'],
  ['Ciudad del Este', 'PY'],
  ['Maringá', 'PR'],
  ['Londrina', 'PR'],
  ['Chapecó', 'SC'],
]
const ORIGENS = ['Meta Ads ABERTO', 'Meta Ads FORMS', 'Meta Ads VENDAS', 'Meta Ads PESADO FROTA', 'Meta Ads CARRO BR', 'Google', 'Indicação']
const ETAPAS: Etapa[] = ['novo', 'contato_feito', 'qualificado', 'proposta_enviada', 'negociacao', 'ganho', 'perdido']

function aleatorio<T>(lista: T[], i: number): T {
  return lista[i % lista.length] as T
}

function fone(i: number): string {
  return `5545${String(991000000 + i * 7919).slice(0, 9)}`
}

export async function carregarDadosExemplo(vendedores: Usuario[], servicos: string[]): Promise<number> {
  if (!vendedores.length) return 0
  const lote = writeBatch(db)
  const agora = new Date()
  let n = 0
  let idx = 0
  for (const v of vendedores) {
    for (let i = 0; i < 9; i++) {
      idx++
      const pj = i % 3 === 0
      const etapa = aleatorio(ETAPAS, idx)
      const dias = (idx * 3) % 20
      const criado = new Date(agora.getTime() - dias * 86400000)
      const [cidade, uf] = aleatorio(CIDADES, idx)
      const veiculo: TipoVeiculo = pj ? aleatorio(['caminhao', 'onibus', 'frota'] as TipoVeiculo[], idx) : aleatorio(['carro', 'carro', 'moto'] as TipoVeiculo[], idx)
      const proximaEm = new Date(agora.getTime() + ((idx % 5) - 2) * 86400000)
      proximaEm.setHours(9 + (idx % 8), 0, 0, 0)
      const valor = pj ? 25000 + (idx % 4) * 15000 : 6000 + (idx % 5) * 2500
      const lead: Omit<Lead, 'id'> & { exemplo: true } = {
        exemplo: true,
        vendedorId: v.id,
        nome: aleatorio(NOMES_PF, idx),
        telefone: fone(idx),
        email: `contato${idx}@exemplo.com`,
        tipoPessoa: pj ? 'PJ' : 'PF',
        empresa: pj ? aleatorio(EMPRESAS, idx) : undefined,
        cidade,
        uf,
        origem: aleatorio(ORIGENS, idx),
        orgao: aleatorio(['receita_federal', 'prf', 'bpfron'] as const, idx),
        tipoVeiculo: veiculo,
        dataApreensao: hojeISO(new Date(criado.getTime() - 2 * 86400000)),
        localApreensao: 'BR-277, Foz do Iguaçu',
        carga: pj ? 'Eletrônicos' : undefined,
        autoInfracao: idx % 2 === 0,
        documentosEmMaos: idx % 2 === 0 ? ['RG ou CNH', 'CRLV'] : ['RG ou CNH'],
        servicoInteresse: aleatorio(servicos, idx),
        valorEstimado: valor,
        etapa,
        qualificado: ['qualificado', 'proposta_enviada', 'negociacao', 'ganho'].includes(etapa),
        prioridade: pj,
        motivoPerda: etapa === 'perdido' ? 'Sem resposta' : undefined,
        proximaAcao: etapa === 'ganho' || etapa === 'perdido' ? null : { tipo: idx % 2 ? 'ligacao' : 'whatsapp', dataHora: isoLocal(proximaEm), descricao: idx % 2 ? 'Retorno sobre proposta' : 'Enviar documentos' },
        ultimoContatoEm: etapa === 'novo' ? null : isoLocal(new Date(agora.getTime() - (idx % 6) * 86400000)),
        tags: [],
      }
      const refLead = doc(collection(db, 'leads'))
      lote.set(refLead, { ...limpar(lead), criadoEm: criado, atualizadoEm: serverTimestamp() })
      n++
      if (etapa !== 'novo') {
        lote.set(doc(collection(db, 'leads', refLead.id, 'interacoes')), {
          vendedorId: v.id,
          tipo: 'ligacao',
          resultado: 'atendeu',
          resumo: 'Primeiro contato. Cliente explicou a apreensão.',
          dataHora: lead.ultimoContatoEm ?? isoLocal(agora),
          duracaoMin: 8,
          exemplo: true,
          criadoEm: serverTimestamp(),
        })
      }
      if (etapa === 'ganho') {
        const refVenda = doc(collection(db, 'vendas'))
        const dataFechamento = hojeISO(new Date(agora.getTime() - (idx % 10) * 86400000))
        const entrada = Math.round(valor * 0.3)
        const numParcelas = 3
        const primeiroVencimento = hojeISO(new Date(agora.getTime() + ((idx % 3) - 1) * 10 * 86400000))
        lote.set(refVenda, {
          exemplo: true,
          vendedorId: v.id,
          leadId: refLead.id,
          clienteNome: lead.empresa ? `${lead.empresa} (${lead.nome})` : lead.nome,
          tipoPessoa: lead.tipoPessoa,
          servico: lead.servicoInteresse,
          valorTotal: valor,
          entrada,
          formaPagamento: 'pix',
          numParcelas,
          primeiroVencimento,
          dataFechamento,
          status: 'ativa',
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        })
        const parcelas = gerarParcelas({ valorTotal: valor, entrada, numParcelas, primeiroVencimento, dataFechamento })
        parcelas.forEach((p, k) => {
          const recebida = k === 0
          lote.set(doc(collection(db, 'parcelas')), {
            ...p,
            exemplo: true,
            vendaId: refVenda.id,
            vendedorId: v.id,
            clienteNome: lead.empresa ? `${lead.empresa} (${lead.nome})` : lead.nome,
            formaPagamento: 'pix',
            status: recebida ? 'recebido' : 'previsto',
            dataRecebimento: recebida ? dataFechamento : null,
            valorRecebido: recebida ? p.valor : null,
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp(),
          })
        })
      }
    }
  }
  await lote.commit()
  return n
}

export async function apagarDadosExemplo(): Promise<number> {
  let total = 0
  for (const col of ['parcelas', 'vendas', 'leads']) {
    const snap = await getDocs(query(collection(db, col), where('exemplo', '==', true)))
    for (let i = 0; i < snap.docs.length; i += 400) {
      const lote = writeBatch(db)
      for (const d of snap.docs.slice(i, i + 400)) {
        if (col === 'leads') {
          const ints = await getDocs(collection(db, 'leads', d.id, 'interacoes'))
          ints.docs.forEach((x) => lote.delete(x.ref))
        }
        lote.delete(d.ref)
        total++
      }
      await lote.commit()
    }
  }
  return total
}

function limpar<T extends object>(o: T): Record<string, unknown> {
  const s: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) if (v !== undefined) s[k] = v
  return s
}
