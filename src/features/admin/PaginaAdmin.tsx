import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { UserPlus, Trash2, Database, ArrowRightLeft, Plus, X } from 'lucide-react'
import { Alternador, Botao, Cartao, Confirmacao, Entrada, Etiqueta, Modal, Selecao, Segmentado, Avatar, useToast, cx } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { db, deDoc, normalizarEmail } from '@/lib/firebase'
import { lerNumeroBR, moeda, numeroBR, data as fmtData } from '@/lib/formatos'
import type { ConfigComissao, Convite, Faixa, Papel, Usuario, Lead } from '@/lib/tipos'
import { reatribuirLeads, useLeadsSobDemanda } from '@/features/leads/dados'
import { apagarDadosExemplo, carregarDadosExemplo } from './dadosExemplo'

type Aba = 'equipe' | 'comissao' | 'listas' | 'reatribuir' | 'exemplo'

export function PaginaAdmin() {
  const { aba: abaParam } = useParams()
  const navegar = useNavigate()
  const aba = (abaParam as Aba) || 'equipe'
  return (
    <Pagina titulo="Administração" subtitulo="Equipe, regras de comissão, listas e ferramentas.">
      <div className="overflow-x-auto sem-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <Segmentado<Aba>
          valor={aba}
          aoMudar={(v) => navegar(`/admin/${v}`)}
          opcoes={[
            { valor: 'equipe', nome: 'Equipe' },
            { valor: 'comissao', nome: 'Comissão' },
            { valor: 'listas', nome: 'Listas' },
            { valor: 'reatribuir', nome: 'Reatribuir leads' },
            { valor: 'exemplo', nome: 'Dados de exemplo' },
          ]}
        />
      </div>
      {aba === 'equipe' && <Equipe />}
      {aba === 'comissao' && <Comissao />}
      {aba === 'listas' && <Listas />}
      {aba === 'reatribuir' && <Reatribuir />}
      {aba === 'exemplo' && <DadosExemplo />}
    </Pagina>
  )
}

/* ----------------------------- Equipe ----------------------------- */

function Equipe() {
  const usuario = useUsuario()
  const { equipe, recarregarEquipe, config } = useAuth()
  const toast = useToast()
  const [convites, setConvites] = useState<Convite[]>([])
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState({ nome: '', email: '', papel: 'vendedor' as Papel, faixa: 'Inicial' as Faixa, meta: numeroBR(config.geral.metaPadraoRecebido) })
  const [salvando, setSalvando] = useState(false)

  async function carregarConvites() {
    try {
      const snap = await getDocs(query(collection(db, 'convites'), orderBy('criadoEm', 'desc')))
      setConvites(snap.docs.map((d) => ({ ...deDoc<Convite>(d), email: d.id })))
    } catch {
      setConvites([])
    }
  }
  useEffect(() => {
    void carregarConvites()
  }, [])

  async function convidar(e: FormEvent) {
    e.preventDefault()
    const email = normalizarEmail(form.email)
    if (!email.includes('@')) return toast.erro('E-mail inválido')
    setSalvando(true)
    try {
      await setDoc(doc(db, 'convites', email), {
        nome: form.nome.trim(),
        papel: form.papel,
        faixa: form.faixa,
        metaMensalRecebido: lerNumeroBR(form.meta),
        convidadoPor: usuario.id,
        aceitoEm: null,
        criadoEm: serverTimestamp(),
      })
      toast.sucesso('Convite salvo', `${email} já pode entrar com este e-mail.`)
      setModal(false)
      setForm({ nome: '', email: '', papel: 'vendedor', faixa: 'Inicial', meta: numeroBR(config.geral.metaPadraoRecebido) })
      await carregarConvites()
    } catch (err) {
      console.error(err)
      toast.erro('Não foi possível salvar o convite')
    } finally {
      setSalvando(false)
    }
  }

  async function salvarUsuario(u: Usuario, parcial: Partial<Usuario>) {
    try {
      await updateDoc(doc(db, 'usuarios', u.id), { ...parcial, atualizadoEm: serverTimestamp() })
      await recarregarEquipe()
      toast.sucesso('Equipe atualizada')
    } catch (err) {
      console.error(err)
      toast.erro('Não foi possível salvar')
    }
  }

  async function removerConvite(email: string) {
    try {
      await deleteDoc(doc(db, 'convites', email))
      await carregarConvites()
    } catch {
      toast.erro('Não foi possível remover')
    }
  }

  const papelNome: Record<Papel, string> = { admin: 'Administrador', gestor: 'Gestor', vendedor: 'Vendedor' }
  const pendentes = convites.filter((c) => !c.aceitoEm)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-platina">Membros ({equipe.length})</h2>
        <Botao variante="primario" tamanho="sm" onClick={() => setModal(true)} icone={<UserPlus className="h-4 w-4" />}>
          Convidar
        </Botao>
      </div>
      <ul className="flex flex-col gap-2">
        {equipe.map((u) => (
          <li key={u.id} className={cx('vidro rounded-md px-4 py-3 flex items-center gap-3', !u.ativo && 'opacity-60')}>
            <Avatar nome={u.nome} fotoUrl={u.fotoUrl} tamanho={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-platina">{u.nome}</p>
              <p className="truncate text-xs text-prata-2">{u.email}</p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Etiqueta tom={u.papel === 'admin' ? 'acento' : 'neutro'}>{papelNome[u.papel]}</Etiqueta>
              <Etiqueta tom="prata">{u.faixa}</Etiqueta>
              <Etiqueta>{moeda(u.metaMensalRecebido)}</Etiqueta>
              {!u.ativo && <Etiqueta tom="atrasado">Inativo</Etiqueta>}
            </div>
            <Botao tamanho="sm" variante="secundario" onClick={() => setEditando(u)}>
              Editar
            </Botao>
          </li>
        ))}
      </ul>

      {pendentes.length > 0 && (
        <>
          <h2 className="text-base font-semibold text-platina mt-2">Convites pendentes ({pendentes.length})</h2>
          <ul className="flex flex-col gap-2">
            {pendentes.map((c) => (
              <li key={c.email} className="vidro rounded-md px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-platina">
                    {c.nome || c.email} <span className="text-prata-3">· {c.email}</span>
                  </p>
                  <p className="text-xs text-prata-3">
                    {papelNome[c.papel]} · criado em {c.criadoEm ? fmtData(c.criadoEm) : ''}
                  </p>
                </div>
                <Botao tamanho="icone" variante="fantasma" aria-label="Remover convite" onClick={() => void removerConvite(c.email)} icone={<Trash2 className="h-4 w-4" />} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Modal aberto={modal} aoFechar={() => setModal(false)} titulo="Convidar pessoa" descricao="Só e-mails cadastrados aqui conseguem entrar." largura="sm">
        <form onSubmit={convidar} className="flex flex-col gap-4">
          <Entrada rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Entrada rotulo="E-mail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Selecao
            rotulo="Papel"
            opcoes={[
              { valor: 'vendedor', nome: 'Vendedor' },
              { valor: 'gestor', nome: 'Gestor (coordenador comercial)' },
              { valor: 'admin', nome: 'Administrador' },
            ]}
            value={form.papel}
            onChange={(e) => setForm({ ...form, papel: e.target.value as Papel })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Selecao rotulo="Faixa inicial" opcoes={config.comissao.faixasFixo.map((f) => ({ valor: f.nome, nome: f.nome }))} value={form.faixa} onChange={(e) => setForm({ ...form, faixa: e.target.value as Faixa })} />
            <Entrada rotulo="Meta mensal (R$)" inputMode="decimal" value={form.meta} onChange={(e) => setForm({ ...form, meta: e.target.value })} />
          </div>
          <Botao type="submit" variante="primario" carregando={salvando}>
            Salvar convite
          </Botao>
        </form>
      </Modal>

      {editando && <ModalEditarUsuario u={editando} podeEditarPapel={editando.id !== usuario.id} aoFechar={() => setEditando(null)} aoSalvar={(p) => void salvarUsuario(editando, p).then(() => setEditando(null))} />}
    </div>
  )
}

function ModalEditarUsuario({ u, podeEditarPapel, aoFechar, aoSalvar }: { u: Usuario; podeEditarPapel: boolean; aoFechar: () => void; aoSalvar: (p: Partial<Usuario>) => void }) {
  const { config } = useAuth()
  const [nome, setNome] = useState(u.nome)
  const [papel, setPapel] = useState<Papel>(u.papel)
  const [faixa, setFaixa] = useState<Faixa>(u.faixa)
  const [meta, setMeta] = useState(numeroBR(u.metaMensalRecebido))
  const [ativo, setAtivo] = useState(u.ativo)
  return (
    <Modal aberto aoFechar={aoFechar} titulo={`Editar ${u.nome}`} largura="sm" rodape={<Botao variante="primario" onClick={() => aoSalvar({ nome: nome.trim(), papel, faixa, metaMensalRecebido: lerNumeroBR(meta), ativo })}>Salvar</Botao>}>
      <div className="flex flex-col gap-4">
        <Entrada rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Selecao
          rotulo="Papel"
          disabled={!podeEditarPapel}
          dica={!podeEditarPapel ? 'Você não pode alterar o próprio papel.' : undefined}
          opcoes={[
            { valor: 'vendedor', nome: 'Vendedor' },
            { valor: 'gestor', nome: 'Gestor' },
            { valor: 'admin', nome: 'Administrador' },
          ]}
          value={papel}
          onChange={(e) => setPapel(e.target.value as Papel)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Selecao rotulo="Faixa atual" opcoes={config.comissao.faixasFixo.map((f) => ({ valor: f.nome, nome: f.nome }))} value={faixa} onChange={(e) => setFaixa(e.target.value as Faixa)} />
          <Entrada rotulo="Meta mensal (R$)" inputMode="decimal" value={meta} onChange={(e) => setMeta(e.target.value)} />
        </div>
        <Alternador rotulo="Ativo" descricao="Inativos não conseguem entrar no app." marcado={ativo} aoMudar={setAtivo} desabilitado={!podeEditarPapel} />
      </div>
    </Modal>
  )
}

/* ----------------------------- Comissão ----------------------------- */

function Comissao() {
  const { config, recarregarConfig } = useAuth()
  const toast = useToast()
  const [c, setC] = useState<ConfigComissao>(config.comissao)
  const [pctV, setPctV] = useState(String(config.comissao.percentualVendedorRecebido).replace('.', ','))
  const [pctC, setPctC] = useState(String(config.comissao.percentualCoordenadorContratos).replace('.', ','))
  const [faixas, setFaixas] = useState(config.comissao.faixasFixo.map((f) => ({ nome: f.nome, fixo: numeroBR(f.valorFixo), minimo: numeroBR(f.minimoVendido) })))
  const [nomeAssistente, setNomeAssistente] = useState(config.geral.nomeAssistente)
  const [nomeApp, setNomeApp] = useState(config.geral.nomeApp)
  const [sabado, setSabado] = useState(config.geral.sabadoUtil)
  const [metaPadrao, setMetaPadrao] = useState(numeroBR(config.geral.metaPadraoRecebido))
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      const novo: ConfigComissao = {
        percentualVendedorRecebido: lerNumeroBR(pctV),
        percentualCoordenadorContratos: lerNumeroBR(pctC),
        faixasFixo: faixas.map((f) => ({ nome: f.nome, valorFixo: lerNumeroBR(f.fixo), minimoVendido: lerNumeroBR(f.minimo) })),
        vigenteDesde: c.vigenteDesde,
      }
      await setDoc(doc(db, 'configuracoes', 'comissao'), novo)
      await setDoc(doc(db, 'configuracoes', 'geral'), { nomeApp: nomeApp.trim() || 'Cockpit PA', nomeAssistente: nomeAssistente.trim() || 'Atlas', sabadoUtil: sabado, metaPadraoRecebido: lerNumeroBR(metaPadrao) }, { merge: true })
      await recarregarConfig()
      setC(novo)
      toast.sucesso('Regras salvas')
    } catch (err) {
      console.error(err)
      toast.erro('Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 max-w-5xl">
      <Cartao className="p-5 flex flex-col gap-4" brilho={false}>
        <h2 className="text-sm font-semibold text-platina">Regras de comissão</h2>
        <Entrada rotulo="Vendedor: % sobre o recebido no mês" inputMode="decimal" value={pctV} onChange={(e) => setPctV(e.target.value)} />
        <Entrada rotulo="Coordenador: % sobre os contratos fechados pelo time" inputMode="decimal" value={pctC} onChange={(e) => setPctC(e.target.value)} />
        <Entrada rotulo="Vigente desde" type="date" value={c.vigenteDesde} onChange={(e) => setC({ ...c, vigenteDesde: e.target.value })} />
        <div>
          <p className="text-[13px] font-medium text-prata-2 mb-2">Fixo por faixa (pelo total vendido no mês)</p>
          <div className="flex flex-col gap-2">
            {faixas.map((f, i) => (
              <div key={f.nome} className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center">
                <span className="text-sm text-platina">{f.nome}</span>
                <Entrada aria-label={`Fixo ${f.nome}`} prefixo="R$" inputMode="decimal" value={f.fixo} onChange={(e) => setFaixas(faixas.map((x, k) => (k === i ? { ...x, fixo: e.target.value } : x)))} />
                <Entrada aria-label={`Mínimo vendido ${f.nome}`} prefixo="de" inputMode="decimal" value={f.minimo} onChange={(e) => setFaixas(faixas.map((x, k) => (k === i ? { ...x, minimo: e.target.value } : x)))} />
              </div>
            ))}
          </div>
        </div>
      </Cartao>
      <Cartao className="p-5 flex flex-col gap-4" brilho={false}>
        <h2 className="text-sm font-semibold text-platina">Geral</h2>
        <Entrada rotulo="Nome do app" value={nomeApp} onChange={(e) => setNomeApp(e.target.value)} />
        <Entrada rotulo="Nome do assistente" value={nomeAssistente} onChange={(e) => setNomeAssistente(e.target.value)} />
        <Entrada rotulo="Meta padrão de recebido (R$)" inputMode="decimal" value={metaPadrao} onChange={(e) => setMetaPadrao(e.target.value)} />
        <Alternador rotulo="Sábado conta como dia útil" descricao="Afeta o ritmo necessário por dia útil." marcado={sabado} aoMudar={setSabado} />
        <div className="mt-auto flex justify-end">
          <Botao variante="primario" onClick={() => void salvar()} carregando={salvando}>
            Salvar regras
          </Botao>
        </div>
      </Cartao>
    </div>
  )
}

/* ----------------------------- Listas ----------------------------- */

function Listas() {
  const { config, recarregarConfig } = useAuth()
  const toast = useToast()
  const [listas, setListas] = useState(config.listas)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await setDoc(doc(db, 'configuracoes', 'listas'), listas)
      await recarregarConfig()
      toast.sucesso('Listas salvas')
    } catch {
      toast.erro('Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  const Editor = ({ chave, titulo }: { chave: keyof typeof listas; titulo: string }) => {
    const [novo, setNovo] = useState('')
    const itens = listas[chave]
    return (
      <Cartao className="p-5 flex flex-col gap-3" brilho={false}>
        <h2 className="text-sm font-semibold text-platina">{titulo}</h2>
        <ul className="flex flex-col gap-1.5">
          {itens.map((it, i) => (
            <li key={`${it}-${i}`} className="flex items-center gap-2 rounded-sm bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-sm text-platina">
              <span className="flex-1">{it}</span>
              <button aria-label={`Remover ${it}`} onClick={() => setListas({ ...listas, [chave]: itens.filter((_, k) => k !== i) })} className="h-8 w-8 flex items-center justify-center text-prata-3 hover:text-platina cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!novo.trim()) return
            setListas({ ...listas, [chave]: [...itens, novo.trim()] })
            setNovo('')
          }}
          className="flex gap-2"
        >
          <Entrada aria-label={`Novo item em ${titulo}`} placeholder="Adicionar" value={novo} onChange={(e) => setNovo(e.target.value)} />
          <Botao type="submit" tamanho="icone" variante="secundario" aria-label="Adicionar" icone={<Plus className="h-4 w-4" />} />
        </form>
      </Cartao>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      <div className="grid gap-4 lg:grid-cols-3">
        <Editor chave="servicos" titulo="Serviços" />
        <Editor chave="origens" titulo="Origens dos leads" />
        <Editor chave="motivosPerda" titulo="Motivos de perda" />
      </div>
      <div className="flex justify-end">
        <Botao variante="primario" onClick={() => void salvar()} carregando={salvando}>
          Salvar listas
        </Botao>
      </div>
    </div>
  )
}

/* ----------------------------- Reatribuir ----------------------------- */

function Reatribuir() {
  const { equipe } = useAuth()
  const toast = useToast()
  const leads = useLeadsSobDemanda(null)
  const [de, setDe] = useState('')
  const [para, setPara] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [salvando, setSalvando] = useState(false)
  const lista = useMemo(() => leads.dados.filter((l) => !de || l.vendedorId === de), [leads.dados, de])
  const ativos = equipe.filter((u) => u.ativo)

  function alternar(id: string) {
    const s = new Set(selecionados)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setSelecionados(s)
  }

  async function aplicar() {
    if (!para || selecionados.size === 0) return
    setSalvando(true)
    try {
      await reatribuirLeads(Array.from(selecionados), para)
      toast.sucesso(`${selecionados.size} leads reatribuídos`)
      setSelecionados(new Set())
      await leads.recarregar()
    } catch {
      toast.erro('Não foi possível reatribuir')
    } finally {
      setSalvando(false)
    }
  }

  const nome = (id: string) => equipe.find((u) => u.id === id)?.nome ?? ''

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Selecao rotulo="Leads de" vazio="Todos os vendedores" opcoes={ativos.map((u) => ({ valor: u.id, nome: u.nome }))} value={de} onChange={(e) => setDe(e.target.value)} />
        <Selecao rotulo="Transferir para" vazio="Escolha o vendedor" opcoes={ativos.map((u) => ({ valor: u.id, nome: u.nome }))} value={para} onChange={(e) => setPara(e.target.value)} />
        <div className="flex items-end">
          <Botao variante="primario" onClick={() => void aplicar()} carregando={salvando} disabled={!para || selecionados.size === 0} icone={<ArrowRightLeft className="h-4 w-4" />}>
            Reatribuir {selecionados.size || ''}
          </Botao>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-prata-3">
        <button className="hover:text-platina cursor-pointer" onClick={() => setSelecionados(new Set(lista.map((l) => l.id)))}>
          Selecionar todos ({lista.length})
        </button>
        <button className="hover:text-platina cursor-pointer" onClick={() => setSelecionados(new Set())}>
          Limpar
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {lista.map((l: Lead) => (
          <li key={l.id}>
            <label className={cx('flex items-center gap-3 rounded-md border px-3 py-2.5 cursor-pointer min-h-[48px]', selecionados.has(l.id) ? 'border-acento/50 bg-acento/10' : 'border-white/[0.06] bg-white/[0.02]')}>
              <input type="checkbox" className="h-5 w-5 accent-[#6d7cff]" checked={selecionados.has(l.id)} onChange={() => alternar(l.id)} />
              <span className="flex-1 min-w-0">
                <span className="block truncate text-sm text-platina">
                  {l.nome}
                  {l.empresa ? ` · ${l.empresa}` : ''}
                </span>
                <span className="block text-xs text-prata-3">
                  {nome(l.vendedorId)} · {l.etapa}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ----------------------------- Dados de exemplo ----------------------------- */

function DadosExemplo() {
  const { equipe, config } = useAuth()
  const toast = useToast()
  const [carregando, setCarregando] = useState(false)
  const [confirmarApagar, setConfirmarApagar] = useState(false)
  const vendedores = equipe.filter((u) => u.ativo && u.papel === 'vendedor')
  const alvo = vendedores.length ? vendedores : equipe.filter((u) => u.ativo)

  async function carregar() {
    setCarregando(true)
    try {
      const n = await carregarDadosExemplo(alvo, config.listas.servicos)
      toast.sucesso(`${n} leads de exemplo criados`, 'Com interações, vendas e parcelas.')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível carregar')
    } finally {
      setCarregando(false)
    }
  }

  async function apagar() {
    setConfirmarApagar(false)
    setCarregando(true)
    try {
      const n = await apagarDadosExemplo()
      toast.info(`${n} documentos de exemplo apagados`)
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível apagar')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Cartao className="p-5 flex flex-col gap-4 max-w-2xl" brilho={false}>
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-prata-2" />
        <h2 className="text-sm font-semibold text-platina">Dados de exemplo</h2>
      </div>
      <p className="text-sm text-prata-2">
        Cria 9 leads por vendedor ({alvo.map((u) => u.nome.split(' ')[0]).join(', ') || 'ninguém ativo'}), com interações, contratos fechados, parcelas recebidas e atrasadas. Tudo fica marcado como exemplo e pode ser apagado depois.
      </p>
      <div className="flex flex-wrap gap-2">
        <Botao variante="primario" onClick={() => void carregar()} carregando={carregando} disabled={!alvo.length}>
          Carregar dados de exemplo
        </Botao>
        <Botao variante="perigo" onClick={() => setConfirmarApagar(true)} disabled={carregando} icone={<Trash2 className="h-4 w-4" />}>
          Apagar dados de exemplo
        </Botao>
      </div>
      <Confirmacao aberto={confirmarApagar} aoFechar={() => setConfirmarApagar(false)} aoConfirmar={() => void apagar()} titulo="Apagar todos os dados de exemplo?" descricao="Leads, interações, vendas e parcelas marcados como exemplo serão removidos." textoConfirmar="Apagar" perigo />
    </Cartao>
  )
}
