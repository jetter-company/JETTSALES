import { collection, doc, getDoc, limit, orderBy, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db, deDoc, paraDoc } from '@/lib/firebase'
import { useConsulta } from '@/lib/consultas'
import { gerarParcelas, arredondar } from '@/lib/comissao'
import { intervaloMes, diaDe } from '@/lib/datas'
import type { FormaPagamento, Parcela, Venda } from '@/lib/tipos'

const vendasCol = () => collection(db, 'vendas')
const parcelasCol = () => collection(db, 'parcelas')

/** Vendas fechadas no mês (do vendedor ou de todos). */
export function useVendasMes(mes: string, vendedorId: string | null) {
  return useConsulta<Venda>(() => {
    const { inicio, fim } = intervaloMes(mes)
    const base = vendedorId ? query(vendasCol(), where('vendedorId', '==', vendedorId)) : query(vendasCol())
    return query(base, where('dataFechamento', '>=', inicio), where('dataFechamento', '<=', `${fim}T23:59:59`), orderBy('dataFechamento', 'desc'), limit(500))
  }, `${mes}:${vendedorId ?? 'todos'}`)
}

/** Parcelas pendentes (previstas e atrasadas) ordenadas por vencimento. */
export function useParcelasPendentes(vendedorId: string | null) {
  return useConsulta<Parcela>(() => {
    const base = vendedorId ? query(parcelasCol(), where('vendedorId', '==', vendedorId)) : query(parcelasCol())
    return query(base, where('status', '==', 'previsto'), orderBy('vencimento', 'asc'), limit(600))
  }, `pend:${vendedorId ?? 'todos'}`)
}

/** Parcelas recebidas no mês (pela data de recebimento). */
export function useParcelasRecebidasMes(mes: string, vendedorId: string | null) {
  return useConsulta<Parcela>(() => {
    const { inicio, fim } = intervaloMes(mes)
    const base = vendedorId ? query(parcelasCol(), where('vendedorId', '==', vendedorId)) : query(parcelasCol())
    return query(base, where('status', '==', 'recebido'), where('dataRecebimento', '>=', inicio), where('dataRecebimento', '<=', `${fim}T23:59:59`), orderBy('dataRecebimento', 'desc'), limit(600))
  }, `rec:${mes}:${vendedorId ?? 'todos'}`)
}

/** Parcelas de uma venda. O filtro por vendedorId é exigido pelas regras para consultas de lista. */
export function useParcelasDaVenda(vendaId: string | null, vendedorId: string | null) {
  return useConsulta<Parcela>(
    () => (vendaId && vendedorId ? query(parcelasCol(), where('vendedorId', '==', vendedorId), where('vendaId', '==', vendaId), orderBy('numero', 'asc')) : null),
    `${vendaId ?? ''}:${vendedorId ?? ''}`,
  )
}

export async function buscarVenda(id: string): Promise<Venda | null> {
  const snap = await getDoc(doc(db, 'vendas', id))
  return snap.exists() ? deDoc<Venda>(snap) : null
}

export type NovaVenda = Omit<Venda, 'id' | 'criadoEm' | 'atualizadoEm' | 'status'>

/** Cria a venda e o cronograma de parcelas em um único lote. */
export async function criarVenda(dados: NovaVenda): Promise<string> {
  const lote = writeBatch(db)
  const refVenda = doc(vendasCol())
  lote.set(refVenda, { ...paraDoc(dados), status: 'ativa', criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() })
  const parcelas = gerarParcelas({
    valorTotal: dados.valorTotal,
    entrada: dados.entrada,
    numParcelas: dados.numParcelas,
    primeiroVencimento: dados.primeiroVencimento,
    dataFechamento: dados.dataFechamento,
  })
  for (const p of parcelas) {
    lote.set(doc(parcelasCol()), {
      ...p,
      vendaId: refVenda.id,
      vendedorId: dados.vendedorId,
      clienteNome: dados.clienteNome,
      formaPagamento: dados.formaPagamento,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }
  await lote.commit()
  return refVenda.id
}

export async function cancelarVenda(id: string): Promise<void> {
  await updateDoc(doc(db, 'vendas', id), { status: 'cancelada', atualizadoEm: serverTimestamp() })
}

/**
 * Marca a parcela como recebida. Se o valor recebido for menor que o valor da parcela,
 * gera uma parcela residual com o saldo, mesmo número e mesmo vencimento.
 */
export async function marcarRecebida(p: Parcela, dataRecebimento: string, valorRecebido: number, formaPagamento?: FormaPagamento): Promise<void> {
  const lote = writeBatch(db)
  const recebido = arredondar(valorRecebido)
  lote.update(doc(db, 'parcelas', p.id), {
    status: 'recebido',
    dataRecebimento: diaDe(dataRecebimento),
    valorRecebido: recebido,
    formaPagamento: formaPagamento ?? p.formaPagamento ?? null,
    atualizadoEm: serverTimestamp(),
  })
  const saldo = arredondar(p.valor - recebido)
  if (saldo > 0.009) {
    lote.set(doc(parcelasCol()), {
      vendaId: p.vendaId,
      vendedorId: p.vendedorId,
      clienteNome: p.clienteNome,
      numero: p.numero,
      valor: saldo,
      vencimento: p.vencimento,
      status: 'previsto',
      formaPagamento: p.formaPagamento ?? null,
      residualDe: p.id,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    })
  }
  await lote.commit()
}

export async function desfazerRecebimento(p: Parcela): Promise<void> {
  await updateDoc(doc(db, 'parcelas', p.id), { status: 'previsto', dataRecebimento: null, valorRecebido: null, atualizadoEm: serverTimestamp() })
}
