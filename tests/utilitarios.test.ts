import { describe, expect, it } from 'vitest'
import { formatarTelefone, linkWhatsApp, normalizarTelefone } from '@/lib/telefone'
import { gerarCsv, lerCsv, sugerirColuna } from '@/lib/csv'
import { lerNumeroBR, moeda } from '@/lib/formatos'
import { montarDados, textoLocal } from '@/lib/briefing'
import type { Lead, Usuario } from '@/lib/tipos'

describe('telefone', () => {
  it('normaliza para 55 + DDD + número', () => {
    expect(normalizarTelefone('(45) 99999-1234')).toBe('5545999991234')
    expect(normalizarTelefone('+55 45 3333-1234')).toBe('554533331234')
    expect(normalizarTelefone('045999991234')).toBe('5545999991234')
  })
  it('formata e monta link do WhatsApp só com dígitos', () => {
    expect(formatarTelefone('5545999991234')).toBe('(45) 99999-1234')
    expect(linkWhatsApp('(45) 99999-1234', 'Olá')).toBe('https://wa.me/5545999991234?text=Ol%C3%A1')
  })
})

describe('csv', () => {
  it('gera com ponto e vírgula, BOM e aspas quando preciso', () => {
    const csv = gerarCsv(
      [
        { chave: 'nome', titulo: 'Nome' },
        { chave: 'valor', titulo: 'Valor' },
      ],
      [{ nome: 'Empresa; Ltda', valor: '1.234,56' }],
    )
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Nome;Valor')
    expect(csv).toContain('"Empresa; Ltda";1.234,56')
  })
  it('lê CSV do Meta Ads com vírgula e aspas', () => {
    const { cabecalho, linhas } = lerCsv('full_name,phone_number,email,campaign_name\n"Silva, João",+55 45 99999-1234,j@x.com,PESADO FROTA\n')
    expect(cabecalho).toEqual(['full_name', 'phone_number', 'email', 'campaign_name'])
    expect(linhas[0]).toEqual(['Silva, João', '+55 45 99999-1234', 'j@x.com', 'PESADO FROTA'])
    expect(sugerirColuna(cabecalho, 'telefone')).toBe(1)
    expect(sugerirColuna(cabecalho, 'origem')).toBe(3)
  })
})

describe('formatos', () => {
  it('lê número brasileiro', () => {
    expect(lerNumeroBR('1.234,56')).toBe(1234.56)
    expect(lerNumeroBR('R$ 200.000')).toBe(200000)
    expect(lerNumeroBR('1234.5')).toBe(1234.5)
  })
  it('formata moeda', () => {
    expect(moeda(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
  })
})

describe('briefing', () => {
  const usuario: Usuario = { id: 'u1', nome: 'Paulo Silva', email: 'p@x.com', papel: 'vendedor', faixa: 'Inicial', ativo: true, metaMensalRecebido: 200000 }
  const agora = new Date(2026, 8, 3, 9, 0, 0)
  const lead = (p: Partial<Lead>): Lead => ({ id: 'l', vendedorId: 'u1', nome: 'Transportes X', telefone: '5545999991234', tipoPessoa: 'PJ', etapa: 'negociacao', qualificado: true, prioridade: true, tags: [], ...p })
  it('monta a lista do dia e o texto local com nomes, horas e valores', () => {
    const { dados, itens } = montarDados({
      usuario,
      escopo: 'vendedor',
      leads: [
        lead({ proximaAcao: { tipo: 'ligacao', dataHora: '2026-09-03T10:00:00-03:00' } }),
        lead({ id: 'l2', nome: 'Maria', tipoPessoa: 'PF', prioridade: false, proximaAcao: { tipo: 'whatsapp', dataHora: '2026-09-01T09:00:00-03:00' } }),
        lead({ id: 'l3', nome: 'Antigo', tipoPessoa: 'PF', prioridade: false, ultimoContatoEm: '2026-08-20T09:00:00-03:00' }),
      ],
      parcelasPendentes: [
        { id: 'p1', vendaId: 'v', vendedorId: 'u1', clienteNome: 'Y', numero: 1, valor: 4500, vencimento: '2026-09-03', status: 'previsto' },
        { id: 'p2', vendaId: 'v', vendedorId: 'u1', clienteNome: 'Z', numero: 2, valor: 1200, vencimento: '2026-08-25', status: 'previsto' },
      ],
      parcelasRecebidasMes: [{ id: 'p3', vendaId: 'v', vendedorId: 'u1', clienteNome: 'W', numero: 1, valor: 50000, vencimento: '2026-09-01', status: 'recebido', dataRecebimento: '2026-09-01', valorRecebido: 50000 }],
      vendasMes: [],
      meta: 200000,
      sabadoUtil: false,
      agora,
    })
    expect(dados.acoesHoje[0]).toMatchObject({ lead: 'Transportes X', hora: '10:00', tipo: 'Ligar' })
    expect(dados.followUpsAtrasados[0]?.lead).toBe('Maria')
    expect(dados.semContato3Dias[0]?.lead).toBe('Antigo')
    expect(dados.parcelasHoje[0]).toMatchObject({ cliente: 'Y', valor: 4500 })
    expect(dados.parcelasAtrasadas[0]).toMatchObject({ cliente: 'Z', diasAtraso: 9 })
    expect(dados.meta.recebido).toBe(50000)
    expect(dados.meta.falta).toBe(150000)
    expect(itens.map((i) => i.tipo)).toEqual(['acao_hoje', 'acao_atrasada', 'sem_contato', 'parcela_atrasada', 'parcela_hoje'])
    const texto = textoLocal(dados).replace(/\u00a0/g, ' ')
    expect(texto).toContain('Transportes X')
    expect(texto).toContain('10:00')
    expect(texto).toContain('R$ 4.500,00')
    expect(texto).not.toContain('—')
  })
})
