import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Receipt, CheckCircle2 } from 'lucide-react'
import { Botao, Cartao, Etiqueta, EstadoVazio, EsqueletoLista, Kpi, Segmentado, Selecao, cx } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { itemCascata } from '@/lib/motion'
import { recebidoNoMes, statusParcela, vendidoNoMes } from '@/lib/comissao'
import { baixarCsv, gerarCsv } from '@/lib/csv'
import { hojeISO, listaMeses, mesAtual } from '@/lib/datas'
import { data as fmtData, mesExtenso, moeda, numeroBR } from '@/lib/formatos'
import { FORMAS_PAGAMENTO, type Parcela } from '@/lib/tipos'
import { ModalRecebimento } from './ModalRecebimento'
import { useParcelasPendentes, useParcelasRecebidasMes, useVendasMes } from './dados'

type Aba = 'parcelas' | 'contratos' | 'recebidas'

export function PaginaVendas() {
  const usuario = useUsuario()
  const { veTudo, equipe } = useAuth()
  const navegar = useNavigate()
  const [mes, setMes] = useState(mesAtual())
  const [aba, setAba] = useState<Aba>('parcelas')
  const [vendedorFiltro, setVendedorFiltro] = useState(veTudo ? 'todos' : usuario.id)
  const [parcelaSel, setParcelaSel] = useState<Parcela | null>(null)
  const escopo = veTudo ? (vendedorFiltro === 'todos' ? null : vendedorFiltro) : usuario.id

  const vendas = useVendasMes(mes, escopo)
  const pendentes = useParcelasPendentes(escopo)
  const recebidas = useParcelasRecebidasMes(mes, escopo)
  const hoje = hojeISO()

  const vendido = useMemo(() => vendidoNoMes(vendas.dados, mes), [vendas.dados, mes])
  const recebido = useMemo(() => recebidoNoMes(recebidas.dados, mes), [recebidas.dados, mes])
  const atrasadas = useMemo(() => pendentes.dados.filter((p) => statusParcela(p, hoje) === 'atrasado'), [pendentes.dados, hoje])
  const valorAtrasado = atrasadas.reduce((s, p) => s + p.valor, 0)
  const nomeVendedor = (id: string) => equipe.find((u) => u.id === id)?.nome.split(' ')[0] ?? ''
  const nomeForma = (f?: string) => FORMAS_PAGAMENTO.find((x) => x.id === f)?.nome ?? ''

  function exportarVendas() {
    baixarCsv(
      `vendas-${mes}.csv`,
      gerarCsv(
        [
          { chave: 'cliente', titulo: 'Cliente' },
          { chave: 'tipo', titulo: 'Tipo' },
          { chave: 'servico', titulo: 'Serviço' },
          { chave: 'valorTotal', titulo: 'Valor total' },
          { chave: 'entrada', titulo: 'Entrada' },
          { chave: 'forma', titulo: 'Forma' },
          { chave: 'parcelas', titulo: 'Parcelas' },
          { chave: 'fechamento', titulo: 'Fechamento' },
          { chave: 'status', titulo: 'Status' },
          { chave: 'vendedor', titulo: 'Vendedor' },
        ],
        vendas.dados.map((v) => ({
          cliente: v.clienteNome,
          tipo: v.tipoPessoa,
          servico: v.servico,
          valorTotal: numeroBR(v.valorTotal),
          entrada: numeroBR(v.entrada),
          forma: nomeForma(v.formaPagamento),
          parcelas: v.numParcelas,
          fechamento: fmtData(v.dataFechamento),
          status: v.status === 'ativa' ? 'Ativa' : 'Cancelada',
          vendedor: nomeVendedor(v.vendedorId),
        })),
      ),
    )
  }

  function exportarParcelas() {
    const lista = aba === 'recebidas' ? recebidas.dados : pendentes.dados
    baixarCsv(
      `parcelas-${aba}-${mes}.csv`,
      gerarCsv(
        [
          { chave: 'cliente', titulo: 'Cliente' },
          { chave: 'numero', titulo: 'Parcela' },
          { chave: 'valor', titulo: 'Valor' },
          { chave: 'vencimento', titulo: 'Vencimento' },
          { chave: 'status', titulo: 'Status' },
          { chave: 'dataRecebimento', titulo: 'Recebido em' },
          { chave: 'valorRecebido', titulo: 'Valor recebido' },
          { chave: 'forma', titulo: 'Forma' },
          { chave: 'vendedor', titulo: 'Vendedor' },
        ],
        lista.map((p) => ({
          cliente: p.clienteNome,
          numero: p.numero === 0 ? 'Entrada' : p.numero,
          valor: numeroBR(p.valor),
          vencimento: fmtData(p.vencimento),
          status: { previsto: 'Previsto', recebido: 'Recebido', atrasado: 'Atrasado' }[statusParcela(p, hoje)],
          dataRecebimento: p.dataRecebimento ? fmtData(p.dataRecebimento) : '',
          valorRecebido: p.valorRecebido != null ? numeroBR(p.valorRecebido) : '',
          forma: nomeForma(p.formaPagamento),
          vendedor: nomeVendedor(p.vendedorId),
        })),
      ),
    )
  }

  const carregando = vendas.carregando && pendentes.carregando && recebidas.carregando

  return (
    <Pagina
      titulo="Vendas e recebimentos"
      subtitulo={mesExtenso(mes)}
      acoes={
        <>
          <Selecao aria-label="Mês" className="w-44" opcoes={listaMeses(12).map((m) => ({ valor: m, nome: mesExtenso(m) }))} value={mes} onChange={(e) => setMes(e.target.value)} />
          {veTudo && <Selecao aria-label="Vendedor" className="w-44" opcoes={[{ valor: 'todos', nome: 'Todo o time' }, ...equipe.filter((u) => u.ativo).map((u) => ({ valor: u.id, nome: u.nome }))]} value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} />}
          <Botao variante="primario" tamanho="sm" onClick={() => navegar('/vendas/nova')} icone={<Plus className="h-4 w-4" />}>
            Registrar venda
          </Botao>
        </>
      }
    >
      <motion.div variants={itemCascata} className="grid gap-3 sm:grid-cols-3">
        <Cartao className="p-5">
          <Kpi rotulo="Vendido no mês" valor={vendido} formatar={moeda} detalhe={`${vendas.dados.filter((v) => v.status === 'ativa').length} contratos fechados`} />
        </Cartao>
        <Cartao className="p-5">
          <Kpi rotulo="Recebido no mês" valor={recebido} formatar={moeda} tom="recebido" detalhe={`${recebidas.dados.length} parcelas recebidas`} />
        </Cartao>
        <Cartao className="p-5">
          <Kpi rotulo="Atrasado a cobrar" valor={valorAtrasado} formatar={moeda} tom={valorAtrasado > 0 ? 'atrasado' : 'neutro'} detalhe={`${atrasadas.length} parcelas vencidas`} />
        </Cartao>
      </motion.div>

      <motion.div variants={itemCascata} className="flex flex-wrap items-center justify-between gap-2">
        <Segmentado<Aba>
          valor={aba}
          aoMudar={setAba}
          opcoes={[
            { valor: 'parcelas', nome: 'A receber' },
            { valor: 'recebidas', nome: 'Recebidas no mês' },
            { valor: 'contratos', nome: 'Contratos do mês' },
          ]}
        />
        <Botao variante="fantasma" tamanho="sm" onClick={aba === 'contratos' ? exportarVendas : exportarParcelas} icone={<Download className="h-4 w-4" />}>
          Exportar CSV
        </Botao>
      </motion.div>

      <motion.div variants={itemCascata}>
        {carregando ? (
          <EsqueletoLista />
        ) : aba === 'contratos' ? (
          vendas.dados.length === 0 ? (
            <EstadoVazio icone={<Receipt className="h-5 w-5" />} titulo="Nenhum contrato neste mês" descricao="Ao marcar um lead como ganho, registre a venda aqui." acao={<Botao variante="primario" onClick={() => navegar('/vendas/nova')}>Registrar venda</Botao>} />
          ) : (
            <ul className="flex flex-col gap-2">
              {vendas.dados.map((v) => (
                <li key={v.id} onClick={() => navegar(`/vendas/${v.id}`)} className={cx('vidro rounded-md px-4 py-3 cursor-pointer hover:border-white/[0.16] transition-colors grid gap-1 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center', v.status === 'cancelada' && 'opacity-60')}>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-platina">{v.clienteNome}</p>
                    <p className="text-xs text-prata-2">
                      {v.servico} · {v.tipoPessoa}
                      {escopo ? '' : ` · ${nomeVendedor(v.vendedorId)}`}
                    </p>
                  </div>
                  <p className="text-xs text-prata-2">Fechado em {fmtData(v.dataFechamento)}</p>
                  <p className="text-xs text-prata-2">
                    Entrada {moeda(v.entrada)} · {v.numParcelas}x · {nomeForma(v.formaPagamento)}
                  </p>
                  <p className="text-platina font-semibold tabular sm:text-right">{moeda(v.valorTotal)}</p>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ListaParcelas parcelas={aba === 'recebidas' ? recebidas.dados : pendentes.dados} hoje={hoje} aoMarcar={setParcelaSel} nomeVendedor={escopo ? undefined : nomeVendedor} />
        )}
      </motion.div>

      <ModalRecebimento parcela={parcelaSel} aberto={!!parcelaSel} aoFechar={() => setParcelaSel(null)} aoSalvar={() => void Promise.all([pendentes.recarregar(), recebidas.recarregar()])} />
    </Pagina>
  )
}

export function ListaParcelas({ parcelas, hoje, aoMarcar, nomeVendedor }: { parcelas: Parcela[]; hoje: string; aoMarcar: (p: Parcela) => void; nomeVendedor?: (id: string) => string }) {
  if (parcelas.length === 0) return <EstadoVazio icone={<CheckCircle2 className="h-5 w-5" />} titulo="Nada por aqui" descricao="Nenhuma parcela nesta lista." />
  return (
    <ul className="flex flex-col gap-2">
      {parcelas.map((p) => {
        const st = statusParcela(p, hoje)
        return (
          <li key={p.id} className={cx('vidro rounded-md px-4 py-3 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center', st === 'atrasado' && 'border-l-2 border-l-atrasado/70')}>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-platina">{p.clienteNome}</p>
              <p className="text-xs text-prata-2">
                {p.numero === 0 ? 'Entrada' : `Parcela ${p.numero}`}
                {nomeVendedor ? ` · ${nomeVendedor(p.vendedorId)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-prata-2">
              <Etiqueta tom={st === 'recebido' ? 'recebido' : st === 'atrasado' ? 'atrasado' : 'neutro'} ponto>
                {st === 'recebido' ? 'Recebido' : st === 'atrasado' ? 'Atrasado' : 'Previsto'}
              </Etiqueta>
              <span className="tabular">{st === 'recebido' && p.dataRecebimento ? `em ${fmtData(p.dataRecebimento)}` : `vence ${fmtData(p.vencimento)}`}</span>
            </div>
            <p className="text-platina font-semibold tabular">{st === 'recebido' ? moeda(p.valorRecebido ?? p.valor) : moeda(p.valor)}</p>
            <div className="sm:justify-self-end">
              {st !== 'recebido' && (
                <Botao tamanho="sm" variante="sucesso" onClick={() => aoMarcar(p)} icone={<CheckCircle2 className="h-4 w-4" />}>
                  Marcar como recebido
                </Botao>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
