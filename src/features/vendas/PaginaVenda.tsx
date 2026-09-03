import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, XCircle } from 'lucide-react'
import { Botao, Cartao, Confirmacao, EsqueletoCartao, Etiqueta, useToast } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useUsuario } from '@/features/auth/AuthProvider'
import { hojeISO } from '@/lib/datas'
import { data as fmtData, moeda } from '@/lib/formatos'
import { FORMAS_PAGAMENTO, type Lead, type Parcela, type Venda } from '@/lib/tipos'
import { buscarLead } from '@/features/leads/dados'
import { FichaRepasse } from '@/features/leads/FichaRepasse'
import { ModalRecebimento } from './ModalRecebimento'
import { ListaParcelas } from './PaginaVendas'
import { buscarVenda, cancelarVenda, desfazerRecebimento, useParcelasDaVenda } from './dados'

export function PaginaVenda() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const usuario = useUsuario()
  const toast = useToast()
  const [venda, setVenda] = useState<Venda | null>(null)
  const [lead, setLead] = useState<Lead | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [parcelaSel, setParcelaSel] = useState<Parcela | null>(null)
  const [repasse, setRepasse] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)
  const parcelas = useParcelasDaVenda(id, venda?.vendedorId ?? null)

  useEffect(() => {
    buscarVenda(id)
      .then(async (v) => {
        setVenda(v)
        if (v?.leadId) setLead(await buscarLead(v.leadId).catch(() => null))
      })
      .catch((e: { code?: string }) => e?.code !== 'permission-denied' && toast.erro('Não foi possível abrir a venda'))
      .finally(() => setCarregando(false))
  }, [id, toast])

  if (carregando) return <EsqueletoCartao linhas={4} />
  if (!venda)
    return (
      <Pagina titulo="Venda não encontrada">
        <Botao variante="secundario" onClick={() => navegar('/vendas')}>
          Voltar
        </Botao>
      </Pagina>
    )

  const recebidoTotal = parcelas.dados.filter((p) => p.status === 'recebido').reduce((s, p) => s + (p.valorRecebido ?? p.valor), 0)
  const nomeForma = FORMAS_PAGAMENTO.find((f) => f.id === venda.formaPagamento)?.nome ?? ''

  async function cancelar() {
    try {
      await cancelarVenda(venda!.id)
      setVenda({ ...venda!, status: 'cancelada' })
      toast.info('Venda cancelada')
    } catch {
      toast.erro('Não foi possível cancelar')
    } finally {
      setConfirmarCancelar(false)
    }
  }

  async function desfazer(p: Parcela) {
    try {
      await desfazerRecebimento(p)
      await parcelas.recarregar()
      toast.info('Recebimento desfeito')
    } catch {
      toast.erro('Não foi possível desfazer')
    }
  }

  return (
    <Pagina
      titulo={venda.clienteNome}
      subtitulo={`${venda.servico} · ${venda.tipoPessoa} · fechado em ${fmtData(venda.dataFechamento)}`}
      acoes={
        <>
          <Botao variante="fantasma" tamanho="sm" onClick={() => navegar(-1)} icone={<ArrowLeft className="h-4 w-4" />}>
            Voltar
          </Botao>
          {lead && (
            <Botao variante="secundario" tamanho="sm" onClick={() => setRepasse(true)} icone={<FileText className="h-4 w-4" />}>
              Ficha de repasse
            </Botao>
          )}
        </>
      }
    >
      <Cartao className="p-5 grid gap-4 sm:grid-cols-4 text-sm" brilho={false}>
        <div>
          <p className="text-xs text-prata-3">Valor total</p>
          <p className="text-xl font-semibold text-platina tabular">{moeda(venda.valorTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-prata-3">Recebido</p>
          <p className="text-xl font-semibold text-[#7ad7b3] tabular">{moeda(recebidoTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-prata-3">Saldo</p>
          <p className="text-xl font-semibold text-platina tabular">{moeda(Math.max(0, venda.valorTotal - recebidoTotal))}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-prata-3">Condições</p>
          <p className="text-platina">
            Entrada {moeda(venda.entrada)} · {venda.numParcelas}x · {nomeForma}
          </p>
          <Etiqueta tom={venda.status === 'ativa' ? 'recebido' : 'neutro'} className="self-start">
            {venda.status === 'ativa' ? 'Ativa' : 'Cancelada'}
          </Etiqueta>
        </div>
        {venda.observacoes && <p className="sm:col-span-4 text-prata-2 whitespace-pre-wrap">{venda.observacoes}</p>}
      </Cartao>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-platina">Parcelas</h2>
        {lead && (
          <Botao variante="fantasma" tamanho="sm" onClick={() => navegar(`/leads/${lead.id}`)}>
            Ver lead
          </Botao>
        )}
      </div>
      {parcelas.carregando ? <EsqueletoCartao /> : <ListaParcelas parcelas={parcelas.dados} hoje={hojeISO()} aoMarcar={setParcelaSel} />}
      {parcelas.dados.some((p) => p.status === 'recebido') && (
        <details className="text-xs text-prata-3">
          <summary className="cursor-pointer">Desfazer um recebimento</summary>
          <ul className="mt-2 flex flex-wrap gap-2">
            {parcelas.dados
              .filter((p) => p.status === 'recebido')
              .map((p) => (
                <Botao key={p.id} tamanho="sm" variante="fantasma" onClick={() => void desfazer(p)}>
                  {p.numero === 0 ? 'Entrada' : `Parcela ${p.numero}`} · {moeda(p.valorRecebido ?? p.valor)}
                </Botao>
              ))}
          </ul>
        </details>
      )}

      {venda.status === 'ativa' && (
        <Botao variante="fantasma" tamanho="sm" className="self-start text-[#ff8a8e]" onClick={() => setConfirmarCancelar(true)} icone={<XCircle className="h-4 w-4" />}>
          Cancelar venda
        </Botao>
      )}

      <ModalRecebimento parcela={parcelaSel} aberto={!!parcelaSel} aoFechar={() => setParcelaSel(null)} aoSalvar={() => void parcelas.recarregar()} />
      {lead && <FichaRepasse lead={lead} venda={venda} aberto={repasse} aoFechar={() => setRepasse(false)} nomeVendedor={usuario.nome} />}
      <Confirmacao aberto={confirmarCancelar} aoFechar={() => setConfirmarCancelar(false)} aoConfirmar={() => void cancelar()} titulo="Cancelar esta venda?" descricao="Ela deixa de contar como vendido. As parcelas previstas continuam visíveis para histórico." textoConfirmar="Cancelar venda" perigo />
    </Pagina>
  )
}
