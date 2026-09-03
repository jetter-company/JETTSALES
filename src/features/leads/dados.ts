import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db, deDoc, paraDoc } from '@/lib/firebase'
import { useTempoReal, useConsulta } from '@/lib/consultas'
import { normalizarTelefone } from '@/lib/telefone'
import { agoraISO } from '@/lib/datas'
import type { Etapa, Interacao, Lead, ProximaAcao, ResultadoInteracao, TipoInteracao } from '@/lib/tipos'

const col = () => collection(db, 'leads')

/** Leads em tempo real: do vendedor ou de todos (gestor). Limitado para respeitar a cota. */
export function useLeadsTempoReal(vendedorId: string | null, ativo = true) {
  return useTempoReal<Lead>(
    () => {
      if (!ativo) return null
      const base = vendedorId ? query(col(), where('vendedorId', '==', vendedorId)) : query(col())
      return query(base, orderBy('atualizadoEm', 'desc'), limit(vendedorId ? 400 : 900))
    },
    `${vendedorId ?? 'todos'}:${ativo}`,
  )
}

export function useLeadsSobDemanda(vendedorId: string | null) {
  return useConsulta<Lead>(() => {
    const base = vendedorId ? query(col(), where('vendedorId', '==', vendedorId)) : query(col())
    return query(base, orderBy('atualizadoEm', 'desc'), limit(vendedorId ? 400 : 900))
  }, vendedorId ?? 'todos')
}

export async function buscarLead(id: string): Promise<Lead | null> {
  const snap = await getDoc(doc(db, 'leads', id))
  return snap.exists() ? deDoc<Lead>(snap) : null
}

export type NovoLead = Omit<Lead, 'id' | 'criadoEm' | 'atualizadoEm'>

export function leadVazio(vendedorId: string): NovoLead {
  return {
    vendedorId,
    nome: '',
    telefone: '',
    tipoPessoa: 'PF',
    etapa: 'novo',
    qualificado: false,
    prioridade: false,
    tags: [],
    proximaAcao: null,
    ultimoContatoEm: null,
  }
}

export function ehPrioridade(l: Pick<Lead, 'tipoPessoa' | 'tipoVeiculo'>): boolean {
  return l.tipoPessoa === 'PJ' || l.tipoVeiculo === 'frota' || l.tipoVeiculo === 'caminhao' || l.tipoVeiculo === 'onibus'
}

export async function criarLead(dados: NovoLead): Promise<string> {
  const telefone = normalizarTelefone(dados.telefone)
  const ref = await addDoc(col(), {
    ...paraDoc(dados),
    telefone,
    prioridade: dados.prioridade || ehPrioridade(dados),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  })
  return ref.id
}

export async function atualizarLead(id: string, parcial: Partial<Lead>): Promise<void> {
  const dados = paraDoc(parcial)
  if (typeof parcial.telefone === 'string') dados.telefone = normalizarTelefone(parcial.telefone)
  await updateDoc(doc(db, 'leads', id), { ...dados, atualizadoEm: serverTimestamp() })
}

export async function excluirLead(id: string): Promise<void> {
  await deleteDoc(doc(db, 'leads', id))
}

export async function moverEtapa(id: string, etapa: Etapa, extras: Partial<Lead> = {}): Promise<void> {
  const parcial: Partial<Lead> = { etapa, ...extras }
  if (etapa === 'qualificado' || etapa === 'proposta_enviada' || etapa === 'negociacao' || etapa === 'ganho') parcial.qualificado = true
  await atualizarLead(id, parcial)
}

export async function reatribuirLeads(ids: string[], novoVendedorId: string): Promise<void> {
  const lote = writeBatch(db)
  for (const id of ids) lote.update(doc(db, 'leads', id), { vendedorId: novoVendedorId, atualizadoEm: serverTimestamp() })
  await lote.commit()
}

/** Verifica telefone duplicado no escopo visível (vendedor: os próprios; gestor: todos). */
export async function buscarPorTelefone(telefone: string, vendedorId: string | null): Promise<Lead[]> {
  const t = normalizarTelefone(telefone)
  if (!t || t.length < 10) return []
  const base = vendedorId ? query(col(), where('vendedorId', '==', vendedorId), where('telefone', '==', t)) : query(col(), where('telefone', '==', t))
  const snap = await getDocs(query(base, limit(5)))
  return snap.docs.map((d) => deDoc<Lead>(d))
}

export function useInteracoes(leadId: string | null) {
  return useConsulta<Interacao>(
    () => (leadId ? query(collection(db, 'leads', leadId, 'interacoes'), orderBy('dataHora', 'desc'), limit(100)) : null),
    leadId ?? '',
  )
}

export interface NovaInteracao {
  tipo: TipoInteracao
  resultado: ResultadoInteracao
  resumo: string
  dataHora?: string
  duracaoMin?: number
  proximaAcao?: ProximaAcao | null
  etapa?: Etapa
}

/** Registra a interação e atualiza o lead (último contato, próxima ação e etapa) em um lote. */
export async function registrarInteracao(lead: Lead, vendedorId: string, nova: NovaInteracao): Promise<void> {
  const lote = writeBatch(db)
  const dataHora = nova.dataHora ?? agoraISO()
  const refInt = doc(collection(db, 'leads', lead.id, 'interacoes'))
  lote.set(refInt, {
    vendedorId,
    tipo: nova.tipo,
    resultado: nova.resultado,
    resumo: nova.resumo,
    dataHora,
    duracaoMin: nova.duracaoMin ?? null,
    criadoEm: serverTimestamp(),
  })
  const atual: Record<string, unknown> = { ultimoContatoEm: dataHora, atualizadoEm: serverTimestamp() }
  if (nova.proximaAcao !== undefined) atual.proximaAcao = nova.proximaAcao
  let etapa = nova.etapa
  if (!etapa && lead.etapa === 'novo' && nova.tipo !== 'anotacao') etapa = 'contato_feito'
  if (etapa) {
    atual.etapa = etapa
    if (etapa === 'qualificado' || etapa === 'proposta_enviada' || etapa === 'negociacao' || etapa === 'ganho') atual.qualificado = true
  }
  lote.update(doc(db, 'leads', lead.id), atual)
  await lote.commit()
}

export interface LeadImportado {
  nome: string
  telefone: string
  email?: string
  origem?: string
  vendedorId: string
}

export async function importarLeads(lista: LeadImportado[]): Promise<number> {
  let total = 0
  for (let i = 0; i < lista.length; i += 400) {
    const lote = writeBatch(db)
    for (const l of lista.slice(i, i + 400)) {
      const ref = doc(col())
      lote.set(ref, {
        ...paraDoc(leadVazio(l.vendedorId)),
        nome: l.nome.trim(),
        telefone: normalizarTelefone(l.telefone),
        email: l.email?.trim() || null,
        origem: l.origem?.trim() || null,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
      total++
    }
    await lote.commit()
  }
  return total
}
