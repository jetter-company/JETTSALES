import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle } from 'lucide-react'
import { AreaTexto, Botao, Caixa, Entrada, Selecao, Segmentado, Alternador } from '@/components/ui'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { lerNumeroBR } from '@/lib/formatos'
import { formatarTelefone, normalizarTelefone } from '@/lib/telefone'
import { DOCUMENTOS_OPCOES, ORGAOS, TIPOS_VEICULO, type Lead, type Orgao, type TipoPessoa, type TipoVeiculo } from '@/lib/tipos'
import { buscarPorTelefone, ehPrioridade, leadVazio, type NovoLead } from './dados'

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

export function FormularioLead({ inicial, aoSalvar, salvando, textoBotao = 'Salvar lead', leadId }: { inicial?: Lead; aoSalvar: (dados: NovoLead) => Promise<void>; salvando: boolean; textoBotao?: string; leadId?: string }) {
  const usuario = useUsuario()
  const { config, veTudo, equipe } = useAuth()
  const [d, setD] = useState<NovoLead>(() => (inicial ? { ...inicial } : leadVazio(usuario.id)))
  const [valorTexto, setValorTexto] = useState(inicial?.valorEstimado ? String(inicial.valorEstimado).replace('.', ',') : '')
  const [duplicados, setDuplicados] = useState<Lead[]>([])
  const [erros, setErros] = useState<Record<string, string>>({})

  function set<K extends keyof NovoLead>(k: K, v: NovoLead[K]) {
    setD((a) => ({ ...a, [k]: v }))
  }

  useEffect(() => {
    const t = normalizarTelefone(d.telefone)
    if (t.length < 12) {
      setDuplicados([])
      return
    }
    const timer = setTimeout(() => {
      buscarPorTelefone(t, veTudo ? null : usuario.id)
        .then((lista) => setDuplicados(lista.filter((l) => l.id !== leadId)))
        .catch(() => setDuplicados([]))
    }, 400)
    return () => clearTimeout(timer)
  }, [d.telefone, veTudo, usuario.id, leadId])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const novosErros: Record<string, string> = {}
    if (!d.nome.trim()) novosErros.nome = 'Informe o nome'
    const tel = normalizarTelefone(d.telefone)
    if (tel.length < 12) novosErros.telefone = 'Informe um telefone com DDD'
    setErros(novosErros)
    if (Object.keys(novosErros).length) return
    const valor = lerNumeroBR(valorTexto)
    await aoSalvar({
      ...d,
      nome: d.nome.trim(),
      telefone: tel,
      valorEstimado: valor > 0 ? valor : undefined,
      prioridade: d.prioridade || ehPrioridade(d),
    })
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-6">
      <section className="vidro rounded-lg p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-prata-2">Dados básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Entrada rotulo="Nome" required autoFocus value={d.nome} onChange={(e) => set('nome', e.target.value)} erro={erros.nome} autoComplete="off" />
          <Entrada
            rotulo="Telefone"
            required
            type="tel"
            inputMode="tel"
            placeholder="(45) 99999-9999"
            value={d.telefone}
            onChange={(e) => set('telefone', e.target.value)}
            onBlur={() => set('telefone', formatarTelefone(d.telefone))}
            erro={erros.telefone}
          />
        </div>
        {duplicados.length > 0 && (
          <div className="flex items-start gap-2 rounded-sm border border-atrasado/40 bg-atrasado/10 px-3 py-2 text-xs text-[#f0c27a]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Telefone já cadastrado: {duplicados.map((l) => l.nome).join(', ')}. Confira antes de salvar.
            </span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-prata-2">Tipo de pessoa</span>
            <Segmentado<TipoPessoa>
              rotuloAria="Tipo de pessoa"
              valor={d.tipoPessoa}
              aoMudar={(v) => set('tipoPessoa', v)}
              opcoes={[
                { valor: 'PF', nome: 'Pessoa física' },
                { valor: 'PJ', nome: 'Pessoa jurídica' },
              ]}
            />
          </div>
          <Entrada rotulo="Empresa" value={d.empresa ?? ''} onChange={(e) => set('empresa', e.target.value)} placeholder={d.tipoPessoa === 'PJ' ? 'Transportadora, frota' : 'Opcional'} />
          <Entrada rotulo="E-mail" type="email" inputMode="email" value={d.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          <div className="grid grid-cols-[1fr_96px] gap-2">
            <Entrada rotulo="Cidade" value={d.cidade ?? ''} onChange={(e) => set('cidade', e.target.value)} />
            <Selecao rotulo="UF" vazio="UF" opcoes={UFS.map((u) => ({ valor: u, nome: u }))} value={d.uf ?? ''} onChange={(e) => set('uf', e.target.value)} />
          </div>
          <Selecao rotulo="Origem" vazio="Escolha a origem" opcoes={config.listas.origens.map((o) => ({ valor: o, nome: o }))} value={d.origem ?? ''} onChange={(e) => set('origem', e.target.value)} />
          <Selecao rotulo="Serviço de interesse" vazio="Escolha o serviço" opcoes={config.listas.servicos.map((o) => ({ valor: o, nome: o }))} value={d.servicoInteresse ?? ''} onChange={(e) => set('servicoInteresse', e.target.value)} />
          {veTudo && (
            <Selecao rotulo="Vendedor responsável" opcoes={equipe.filter((u) => u.ativo).map((u) => ({ valor: u.id, nome: u.nome }))} value={d.vendedorId} onChange={(e) => set('vendedorId', e.target.value)} />
          )}
        </div>
      </section>

      <section className="vidro rounded-lg p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-prata-2">Apreensão</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Órgão da apreensão" vazio="Escolha o órgão" opcoes={ORGAOS.map((o) => ({ valor: o.id, nome: o.nome }))} value={d.orgao ?? ''} onChange={(e) => set('orgao', (e.target.value || undefined) as Orgao | undefined)} />
          <Selecao rotulo="Tipo de veículo" vazio="Escolha o veículo" opcoes={TIPOS_VEICULO.map((o) => ({ valor: o.id, nome: o.nome }))} value={d.tipoVeiculo ?? ''} onChange={(e) => set('tipoVeiculo', (e.target.value || undefined) as TipoVeiculo | undefined)} />
          <Entrada rotulo="Data da apreensão" type="date" value={d.dataApreensao ?? ''} onChange={(e) => set('dataApreensao', e.target.value)} />
          <Entrada rotulo="Local da apreensão" value={d.localApreensao ?? ''} onChange={(e) => set('localApreensao', e.target.value)} placeholder="Cidade, rodovia, posto" />
          <Entrada rotulo="Carga ou mercadoria" value={d.carga ?? ''} onChange={(e) => set('carga', e.target.value)} />
          <Entrada rotulo="Valor estimado (R$)" inputMode="decimal" placeholder="0,00" value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} />
        </div>
        <Alternador rotulo="Existe auto de infração" marcado={!!d.autoInfracao} aoMudar={(v) => set('autoInfracao', v)} />
        <div>
          <p className="mb-2 text-[13px] font-medium text-prata-2">Documentos em mãos</p>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {DOCUMENTOS_OPCOES.map((doc) => (
              <Caixa
                key={doc}
                rotulo={doc}
                checked={d.documentosEmMaos?.includes(doc) ?? false}
                onChange={(e) => {
                  const atual = new Set(d.documentosEmMaos ?? [])
                  if (e.target.checked) atual.add(doc)
                  else atual.delete(doc)
                  set('documentosEmMaos', Array.from(atual))
                }}
              />
            ))}
          </div>
        </div>
        <AreaTexto rotulo="Observações" value={d.observacoes ?? ''} onChange={(e) => set('observacoes', e.target.value)} rows={3} />
        {d.orgao === 'fora_de_escopo' && (
          <p className="rounded-sm border border-atrasado/40 bg-atrasado/10 px-3 py-2 text-xs text-[#f0c27a]">
            Fora de escopo: o escritório não atende apreensão por banco, financiamento, IPVA ou multa. Considere marcar como perdido com esse motivo.
          </p>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Botao type="submit" variante="primario" tamanho="lg" carregando={salvando}>
          {textoBotao}
        </Botao>
      </div>
    </form>
  )
}
