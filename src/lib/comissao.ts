// Motor de comissão e agregações financeiras. Funções puras e determinísticas,
// sempre calculadas a partir dos documentos (vendas, parcelas), nunca de totais
// digitados à mão.

import type { ConfigComissao, Faixa, FaixaFixo, Parcela, StatusParcelaCalculado, Venda } from './tipos'
import { diasUteisRestantes, diaDe, mesDe } from './datas'

export interface ExtratoMensal {
  mes: string
  vendido: number
  recebido: number
  faixa: Faixa
  fixo: number
  percentual: number
  comissao: number
  totalPrevisto: number
  proximaFaixa: FaixaFixo | null
  faltaProximaFaixa: number
}

export function faixasOrdenadas(faixas: FaixaFixo[]): FaixaFixo[] {
  return [...faixas].sort((a, b) => a.minimoVendido - b.minimoVendido)
}

/** Faixa definida pelo total vendido no mês: a maior faixa cujo mínimo foi atingido. */
export function faixaPorVendido(vendido: number, faixas: FaixaFixo[]): FaixaFixo {
  const ordenadas = faixasOrdenadas(faixas)
  let atual = ordenadas[0]
  if (!atual) throw new Error('Configuração de faixas vazia')
  for (const f of ordenadas) if (vendido >= f.minimoVendido) atual = f
  return atual
}

export function proximaFaixa(vendido: number, faixas: FaixaFixo[]): FaixaFixo | null {
  const ordenadas = faixasOrdenadas(faixas)
  return ordenadas.find((f) => vendido < f.minimoVendido) ?? null
}

export function vendasDoMes(vendas: Venda[], mes: string, vendedorId?: string): Venda[] {
  return vendas.filter(
    (v) => v.status === 'ativa' && mesDe(v.dataFechamento) === mes && (!vendedorId || v.vendedorId === vendedorId),
  )
}

/** Vendido: soma dos contratos fechados no mês. */
export function vendidoNoMes(vendas: Venda[], mes: string, vendedorId?: string): number {
  return arredondar(vendasDoMes(vendas, mes, vendedorId).reduce((s, v) => s + v.valorTotal, 0))
}

export function parcelasRecebidasNoMes(parcelas: Parcela[], mes: string, vendedorId?: string): Parcela[] {
  return parcelas.filter(
    (p) =>
      p.status === 'recebido' &&
      !!p.dataRecebimento &&
      mesDe(p.dataRecebimento) === mes &&
      (!vendedorId || p.vendedorId === vendedorId),
  )
}

/** Recebido: soma das parcelas efetivamente recebidas no mês. */
export function recebidoNoMes(parcelas: Parcela[], mes: string, vendedorId?: string): number {
  return arredondar(parcelasRecebidasNoMes(parcelas, mes, vendedorId).reduce((s, p) => s + (p.valorRecebido ?? p.valor), 0))
}

export function comissaoVendedor(recebido: number, percentual: number): number {
  return arredondar((recebido * percentual) / 100)
}

export function comissaoCoordenador(vendidoTime: number, percentual: number): number {
  return arredondar((vendidoTime * percentual) / 100)
}

export function extratoMensal(vendas: Venda[], parcelas: Parcela[], mes: string, vendedorId: string, cfg: ConfigComissao): ExtratoMensal {
  const vendido = vendidoNoMes(vendas, mes, vendedorId)
  const recebido = recebidoNoMes(parcelas, mes, vendedorId)
  const faixa = faixaPorVendido(vendido, cfg.faixasFixo)
  const prox = proximaFaixa(vendido, cfg.faixasFixo)
  const comissao = comissaoVendedor(recebido, cfg.percentualVendedorRecebido)
  return {
    mes,
    vendido,
    recebido,
    faixa: faixa.nome,
    fixo: faixa.valorFixo,
    percentual: cfg.percentualVendedorRecebido,
    comissao,
    totalPrevisto: arredondar(faixa.valorFixo + comissao),
    proximaFaixa: prox,
    faltaProximaFaixa: prox ? arredondar(prox.minimoVendido - vendido) : 0,
  }
}

/** Status calculado pela data: previsto vence hoje ou depois; atrasado venceu antes de hoje. */
export function statusParcela(p: Pick<Parcela, 'status' | 'vencimento'>, hoje: string): StatusParcelaCalculado {
  if (p.status === 'recebido') return 'recebido'
  return diaDe(p.vencimento) < hoje ? 'atrasado' : 'previsto'
}

export interface GeracaoParcelas {
  valorTotal: number
  entrada: number
  numParcelas: number
  primeiroVencimento: string
  dataFechamento: string
}

/**
 * Cronograma de parcelas. A entrada, quando existe, vira a parcela 0 com vencimento
 * na data de fechamento. O restante é dividido em numParcelas mensais; a diferença
 * de centavos vai para a última parcela.
 */
export function gerarParcelas(g: GeracaoParcelas): Omit<Parcela, 'id' | 'vendaId' | 'vendedorId' | 'clienteNome'>[] {
  const saldo = arredondar(g.valorTotal - g.entrada)
  const n = Math.max(0, Math.floor(g.numParcelas))
  const lista: Omit<Parcela, 'id' | 'vendaId' | 'vendedorId' | 'clienteNome'>[] = []
  if (g.entrada > 0) {
    lista.push({ numero: 0, valor: arredondar(g.entrada), vencimento: diaDe(g.dataFechamento), status: 'previsto' })
  }
  if (n > 0 && saldo > 0) {
    const base = Math.floor((saldo / n) * 100) / 100
    let acumulado = 0
    for (let i = 0; i < n; i++) {
      const ultima = i === n - 1
      const valor = ultima ? arredondar(saldo - acumulado) : base
      acumulado = arredondar(acumulado + valor)
      lista.push({ numero: i + 1, valor, vencimento: somarMeses(diaDe(g.primeiroVencimento), i), status: 'previsto' })
    }
  }
  return lista
}

/** Soma meses a uma data yyyy-MM-dd mantendo o dia quando possível (ou o último do mês). */
export function somarMeses(dia: string, meses: number): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number]
  const alvoMes = m - 1 + meses
  const ano = a + Math.floor(alvoMes / 12)
  const mes = ((alvoMes % 12) + 12) % 12
  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const diaFinal = Math.min(d, ultimoDia)
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(diaFinal).padStart(2, '0')}`
}

export interface RitmoMeta {
  meta: number
  realizado: number
  falta: number
  percentual: number
  diasUteisRestantes: number
  porDiaUtil: number
}

export function ritmoMeta(meta: number, realizado: number, agora: Date, sabadoUtil = false): RitmoMeta {
  const falta = Math.max(0, arredondar(meta - realizado))
  const dias = diasUteisRestantes(agora, sabadoUtil)
  return {
    meta,
    realizado,
    falta,
    percentual: meta > 0 ? Math.min(100, (realizado / meta) * 100) : 0,
    diasUteisRestantes: dias,
    porDiaUtil: dias > 0 ? arredondar(falta / dias) : falta,
  }
}

export function ticketMedio(vendas: Venda[]): number {
  if (!vendas.length) return 0
  return arredondar(vendas.reduce((s, v) => s + v.valorTotal, 0) / vendas.length)
}

export function arredondar(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
