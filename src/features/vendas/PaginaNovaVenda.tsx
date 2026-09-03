import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Botao, Cartao, Entrada, Selecao, Segmentado, AreaTexto, useToast } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { gerarParcelas } from '@/lib/comissao'
import { hojeISO } from '@/lib/datas'
import { data as fmtData, lerNumeroBR, moeda } from '@/lib/formatos'
import { FORMAS_PAGAMENTO, type FormaPagamento, type Lead, type TipoPessoa } from '@/lib/tipos'
import { buscarLead } from '@/features/leads/dados'
import { criarVenda } from './dados'
import { somarMeses } from '@/lib/comissao'

export function PaginaNovaVenda() {
  const [params] = useSearchParams()
  const leadId = params.get('leadId') ?? ''
  const navegar = useNavigate()
  const usuario = useUsuario()
  const { config, veTudo, equipe } = useAuth()
  const toast = useToast()
  const [lead, setLead] = useState<Lead | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [tipoPessoa, setTipoPessoa] = useState<TipoPessoa>('PF')
  const [servico, setServico] = useState(config.listas.servicos[0] ?? '')
  const [valorTotal, setValorTotal] = useState('')
  const [entrada, setEntrada] = useState('')
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [numParcelas, setNumParcelas] = useState('1')
  const [dataFechamento, setDataFechamento] = useState(hojeISO())
  const [primeiroVencimento, setPrimeiroVencimento] = useState(somarMeses(hojeISO(), 1))
  const [obs, setObs] = useState('')
  const [vendedorId, setVendedorId] = useState(usuario.id)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!leadId) return
    buscarLead(leadId)
      .then((l) => {
        if (!l) return
        setLead(l)
        setClienteNome(l.empresa && l.tipoPessoa === 'PJ' ? `${l.empresa} (${l.nome})` : l.nome)
        setTipoPessoa(l.tipoPessoa)
        if (l.servicoInteresse) setServico(l.servicoInteresse)
        if (l.valorEstimado) setValorTotal(String(l.valorEstimado).replace('.', ','))
        setVendedorId(l.vendedorId)
      })
      .catch(() => undefined)
  }, [leadId])

  const total = lerNumeroBR(valorTotal)
  const ent = lerNumeroBR(entrada)
  const n = Math.max(0, Number(numParcelas) || 0)
  const parcelas = useMemo(() => (total > 0 ? gerarParcelas({ valorTotal: total, entrada: ent, numParcelas: n, primeiroVencimento, dataFechamento }) : []), [total, ent, n, primeiroVencimento, dataFechamento])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!clienteNome.trim()) return toast.erro('Informe o cliente')
    if (total <= 0) return toast.erro('Informe o valor total')
    if (ent > total) return toast.erro('A entrada não pode ser maior que o total')
    if (total - ent > 0 && n < 1) return toast.erro('Informe o número de parcelas')
    setSalvando(true)
    try {
      const id = await criarVenda({
        vendedorId,
        leadId,
        clienteNome: clienteNome.trim(),
        tipoPessoa,
        servico,
        valorTotal: total,
        entrada: ent,
        formaPagamento: forma,
        numParcelas: total - ent > 0 ? n : 0,
        primeiroVencimento,
        dataFechamento,
        observacoes: obs.trim() || undefined,
      })
      toast.sucesso('Venda registrada', `${parcelas.length} parcelas geradas.`)
      if (leadId) navegar(`/leads/${leadId}?repasse=1`, { replace: true })
      else navegar(`/vendas/${id}`, { replace: true })
    } catch (err) {
      console.error(err)
      toast.erro('Não foi possível registrar a venda')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Pagina
      titulo="Registrar venda"
      subtitulo={lead ? `Contrato do lead ${lead.nome}` : 'Contrato fechado'}
      acoes={
        <Botao variante="fantasma" tamanho="sm" onClick={() => navegar(-1)} icone={<ArrowLeft className="h-4 w-4" />}>
          Voltar
        </Botao>
      }
    >
      <form onSubmit={salvar} className="grid gap-5 lg:grid-cols-[1.2fr_1fr] max-w-5xl">
        <Cartao className="p-5 flex flex-col gap-4" brilho={false}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Entrada rotulo="Cliente" required value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="sm:col-span-2" />
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-prata-2">Tipo</span>
              <Segmentado<TipoPessoa>
                valor={tipoPessoa}
                aoMudar={setTipoPessoa}
                opcoes={[
                  { valor: 'PF', nome: 'Pessoa física' },
                  { valor: 'PJ', nome: 'Pessoa jurídica' },
                ]}
              />
            </div>
            <Selecao rotulo="Serviço" required opcoes={config.listas.servicos.map((s) => ({ valor: s, nome: s }))} value={servico} onChange={(e) => setServico(e.target.value)} />
            <Entrada rotulo="Valor total (R$)" required inputMode="decimal" placeholder="0,00" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
            <Entrada rotulo="Entrada (R$)" inputMode="decimal" placeholder="0,00" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            <Selecao rotulo="Forma de pagamento" opcoes={FORMAS_PAGAMENTO.map((f) => ({ valor: f.id, nome: f.nome }))} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)} />
            <Entrada rotulo="Número de parcelas" type="number" inputMode="numeric" min={0} max={48} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
            <Entrada rotulo="Data de fechamento" type="date" required value={dataFechamento} onChange={(e) => setDataFechamento(e.target.value)} />
            <Entrada rotulo="Primeiro vencimento" type="date" required value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
            {veTudo && (
              <Selecao rotulo="Vendedor" opcoes={equipe.filter((u) => u.ativo).map((u) => ({ valor: u.id, nome: u.nome }))} value={vendedorId} onChange={(e) => setVendedorId(e.target.value)} className="sm:col-span-2" />
            )}
            <AreaTexto rotulo="Observações" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="sm:col-span-2" />
          </div>
          <div className="flex justify-end">
            <Botao type="submit" variante="primario" tamanho="lg" carregando={salvando}>
              Salvar venda e gerar parcelas
            </Botao>
          </div>
        </Cartao>

        <Cartao className="p-5" brilho={false}>
          <h2 className="text-sm font-semibold text-prata-2 mb-3">Cronograma de parcelas</h2>
          {parcelas.length === 0 ? (
            <p className="text-sm text-prata-3">Informe o valor para ver as parcelas.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/[0.06] text-sm">
              {parcelas.map((p) => (
                <li key={p.numero} className="flex items-center justify-between py-2">
                  <span className="text-prata-2">{p.numero === 0 ? 'Entrada' : `Parcela ${p.numero}`}</span>
                  <span className="text-prata-3 tabular">{fmtData(p.vencimento)}</span>
                  <span className="text-platina tabular font-medium">{moeda(p.valor)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between pt-3 font-semibold">
                <span className="text-prata-2">Total</span>
                <span className="text-platina tabular">{moeda(parcelas.reduce((s, p) => s + p.valor, 0))}</span>
              </li>
            </ul>
          )}
        </Cartao>
      </form>
    </Pagina>
  )
}
