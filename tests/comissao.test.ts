import { describe, expect, it } from 'vitest'
import { COMISSAO_PADRAO, type Parcela, type Venda } from '@/lib/tipos'
import { comissaoCoordenador, comissaoVendedor, extratoMensal, faixaPorVendido, gerarParcelas, proximaFaixa, recebidoNoMes, ritmoMeta, somarMeses, statusParcela, vendidoNoMes } from '@/lib/comissao'

const venda = (p: Partial<Venda>): Venda => ({
  id: 'v',
  vendedorId: 'u1',
  leadId: 'l',
  clienteNome: 'Cliente',
  tipoPessoa: 'PF',
  servico: 'Diligência',
  valorTotal: 10000,
  entrada: 0,
  formaPagamento: 'pix',
  numParcelas: 1,
  primeiroVencimento: '2026-09-10',
  dataFechamento: '2026-09-05',
  status: 'ativa',
  ...p,
})

const parcela = (p: Partial<Parcela>): Parcela => ({
  id: 'p',
  vendaId: 'v',
  vendedorId: 'u1',
  clienteNome: 'Cliente',
  numero: 1,
  valor: 1000,
  vencimento: '2026-09-10',
  status: 'previsto',
  ...p,
})

describe('faixas por vendido', () => {
  const faixas = COMISSAO_PADRAO.faixasFixo
  it('Inicial até 49.999,99', () => {
    expect(faixaPorVendido(0, faixas).nome).toBe('Inicial')
    expect(faixaPorVendido(49999.99, faixas).nome).toBe('Inicial')
  })
  it('Pleno de 50.000 a 99.999,99', () => {
    expect(faixaPorVendido(50000, faixas).nome).toBe('Pleno')
    expect(faixaPorVendido(99999.99, faixas).nome).toBe('Pleno')
  })
  it('Sênior a partir de 100.000', () => {
    expect(faixaPorVendido(100000, faixas).nome).toBe('Sênior')
    expect(faixaPorVendido(250000, faixas).valorFixo).toBe(2500)
  })
  it('próxima faixa e quanto falta', () => {
    expect(proximaFaixa(30000, faixas)?.nome).toBe('Pleno')
    expect(proximaFaixa(120000, faixas)).toBeNull()
  })
})

describe('vendido e recebido', () => {
  it('vendido soma só contratos ativos do mês', () => {
    const vendas = [venda({ valorTotal: 30000 }), venda({ id: 'b', valorTotal: 25000, status: 'cancelada' }), venda({ id: 'c', valorTotal: 9000, dataFechamento: '2026-08-30' })]
    expect(vendidoNoMes(vendas, '2026-09')).toBe(30000)
    expect(vendidoNoMes(vendas, '2026-08')).toBe(9000)
  })
  it('recebido soma parcelas recebidas pela data de recebimento', () => {
    const parcelas = [
      parcela({ status: 'recebido', dataRecebimento: '2026-09-02', valorRecebido: 1000 }),
      parcela({ id: 'b', status: 'recebido', dataRecebimento: '2026-08-28', valorRecebido: 500 }),
      parcela({ id: 'c', status: 'previsto' }),
      parcela({ id: 'd', status: 'recebido', dataRecebimento: '2026-09-15', valorRecebido: 350.5, vendedorId: 'u2' }),
    ]
    expect(recebidoNoMes(parcelas, '2026-09')).toBe(1350.5)
    expect(recebidoNoMes(parcelas, '2026-09', 'u1')).toBe(1000)
  })
})

describe('comissão', () => {
  it('3% do recebido e 1% do vendido pelo time', () => {
    expect(comissaoVendedor(10000, 3)).toBe(300)
    expect(comissaoCoordenador(250000, 1)).toBe(2500)
  })
  it('extrato muda de faixa ao cruzar 50.000 e 100.000', () => {
    const p = [parcela({ status: 'recebido', dataRecebimento: '2026-09-01', valorRecebido: 20000 })]
    const e1 = extratoMensal([venda({ valorTotal: 49999.99 })], p, '2026-09', 'u1', COMISSAO_PADRAO)
    expect(e1.faixa).toBe('Inicial')
    expect(e1.fixo).toBe(1500)
    expect(e1.comissao).toBe(600)
    expect(e1.totalPrevisto).toBe(2100)
    expect(e1.faltaProximaFaixa).toBe(0.01)
    const e2 = extratoMensal([venda({ valorTotal: 50000 })], p, '2026-09', 'u1', COMISSAO_PADRAO)
    expect(e2.faixa).toBe('Pleno')
    const e3 = extratoMensal([venda({ valorTotal: 60000 }), venda({ id: 'b', valorTotal: 40000 })], p, '2026-09', 'u1', COMISSAO_PADRAO)
    expect(e3.faixa).toBe('Sênior')
    expect(e3.proximaFaixa).toBeNull()
  })
})

describe('parcelas', () => {
  it('gera entrada + parcelas mensais e joga os centavos na última', () => {
    const lista = gerarParcelas({ valorTotal: 10000, entrada: 1000, numParcelas: 3, primeiroVencimento: '2026-10-31', dataFechamento: '2026-09-15' })
    expect(lista).toHaveLength(4)
    expect(lista[0]).toMatchObject({ numero: 0, valor: 1000, vencimento: '2026-09-15' })
    expect(lista.slice(1).map((p) => p.valor)).toEqual([3000, 3000, 3000])
    expect(lista.slice(1).map((p) => p.vencimento)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31'])
    const soma = lista.reduce((s, p) => s + p.valor, 0)
    expect(soma).toBe(10000)
  })
  it('divide 1000 em 3 sem perder centavos', () => {
    const lista = gerarParcelas({ valorTotal: 1000, entrada: 0, numParcelas: 3, primeiroVencimento: '2026-10-05', dataFechamento: '2026-09-15' })
    expect(lista.map((p) => p.valor)).toEqual([333.33, 333.33, 333.34])
  })
  it('status por data', () => {
    expect(statusParcela({ status: 'previsto', vencimento: '2026-09-10' }, '2026-09-11')).toBe('atrasado')
    expect(statusParcela({ status: 'previsto', vencimento: '2026-09-10' }, '2026-09-10')).toBe('previsto')
    expect(statusParcela({ status: 'recebido', vencimento: '2026-09-01' }, '2026-09-11')).toBe('recebido')
  })
  it('somarMeses respeita o fim do mês', () => {
    expect(somarMeses('2026-01-31', 1)).toBe('2026-02-28')
    expect(somarMeses('2026-12-15', 1)).toBe('2027-01-15')
  })
})

describe('ritmo da meta', () => {
  it('calcula falta e valor por dia útil', () => {
    // 2026-09-03 é quinta. Dias úteis restantes em setembro (seg a sex, incluindo hoje): 20.
    const r = ritmoMeta(200000, 50000, new Date(2026, 8, 3, 10, 0, 0))
    expect(r.falta).toBe(150000)
    expect(r.diasUteisRestantes).toBe(20)
    expect(r.porDiaUtil).toBe(7500)
    expect(Math.round(r.percentual)).toBe(25)
  })
})
