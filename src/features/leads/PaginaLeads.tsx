import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Upload, Download, KanbanSquare, List, Users } from 'lucide-react'
import { Botao, Entrada, Selecao, Segmentado, EstadoVazio, EsqueletoLista, Particulas, useToast } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { itemCascata } from '@/lib/motion'
import { baixarCsv, gerarCsv } from '@/lib/csv'
import { data, numeroBR } from '@/lib/formatos'
import { formatarTelefone } from '@/lib/telefone'
import { hojeISO } from '@/lib/datas'
import { ETAPAS, type Etapa, type Lead } from '@/lib/tipos'
import { Kanban } from './Kanban'
import { ListaLeads } from './ListaLeads'
import { ModalPerda } from './ModalPerda'
import { moverEtapa, useLeadsTempoReal } from './dados'
import { nomeOrgao, nomeVeiculo } from './acoesLead'

type Visao = 'kanban' | 'lista'

export function PaginaLeads() {
  const usuario = useUsuario()
  const { veTudo, equipe, config } = useAuth()
  const navegar = useNavigate()
  const toast = useToast()
  const [visao, setVisao] = useState<Visao>(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'kanban' : 'kanban'))
  const [busca, setBusca] = useState('')
  const buscaAdiada = useDeferredValue(busca)
  const [vendedorFiltro, setVendedorFiltro] = useState<string>(veTudo ? 'todos' : usuario.id)
  const [etapaFiltro, setEtapaFiltro] = useState<Etapa | ''>('')
  const [origemFiltro, setOrigemFiltro] = useState('')
  const [somentePrioridade, setSomentePrioridade] = useState(false)
  const [leadPerda, setLeadPerda] = useState<Lead | null>(null)
  const [celebrar, setCelebrar] = useState(false)

  const escopo = veTudo ? (vendedorFiltro === 'todos' ? null : vendedorFiltro) : usuario.id
  const { dados: leads, carregando, erro } = useLeadsTempoReal(escopo)

  const nomesVendedores = useMemo(() => Object.fromEntries(equipe.map((u) => [u.id, u.nome.split(' ')[0] ?? u.nome])), [equipe])

  const filtrados = useMemo(() => {
    const q = buscaAdiada.trim().toLowerCase()
    return leads.filter((l) => {
      if (etapaFiltro && l.etapa !== etapaFiltro) return false
      if (origemFiltro && l.origem !== origemFiltro) return false
      if (somentePrioridade && !l.prioridade) return false
      if (!q) return true
      const alvo = [l.nome, l.empresa, l.telefone, l.email, l.cidade, l.carga, l.observacoes, l.origem].filter(Boolean).join(' ').toLowerCase()
      return alvo.includes(q) || formatarTelefone(l.telefone).includes(q)
    })
  }, [leads, buscaAdiada, etapaFiltro, origemFiltro, somentePrioridade])

  const pedirGanho = useCallback(
    async (lead: Lead) => {
      try {
        await moverEtapa(lead.id, 'ganho', { proximaAcao: null })
        setCelebrar(true)
        toast.sucesso('Lead ganho', 'Registre a venda para gerar as parcelas.')
        setTimeout(() => navegar(`/vendas/nova?leadId=${lead.id}`), 700)
      } catch (e) {
        console.error(e)
        toast.erro('Não foi possível marcar como ganho')
      }
    },
    [navegar, toast],
  )

  function exportar() {
    const csv = gerarCsv(
      [
        { chave: 'nome', titulo: 'Nome' },
        { chave: 'telefone', titulo: 'Telefone' },
        { chave: 'email', titulo: 'E-mail' },
        { chave: 'tipoPessoa', titulo: 'Tipo' },
        { chave: 'empresa', titulo: 'Empresa' },
        { chave: 'cidade', titulo: 'Cidade' },
        { chave: 'uf', titulo: 'UF' },
        { chave: 'origem', titulo: 'Origem' },
        { chave: 'orgao', titulo: 'Órgão' },
        { chave: 'tipoVeiculo', titulo: 'Veículo' },
        { chave: 'dataApreensao', titulo: 'Data apreensão' },
        { chave: 'servicoInteresse', titulo: 'Serviço' },
        { chave: 'valorEstimado', titulo: 'Valor estimado' },
        { chave: 'etapa', titulo: 'Etapa' },
        { chave: 'prioridade', titulo: 'Prioridade' },
        { chave: 'motivoPerda', titulo: 'Motivo perda' },
        { chave: 'proximaAcao', titulo: 'Próxima ação' },
        { chave: 'ultimoContatoEm', titulo: 'Último contato' },
        { chave: 'vendedor', titulo: 'Vendedor' },
        { chave: 'criadoEm', titulo: 'Criado em' },
      ],
      filtrados.map((l) => ({
        nome: l.nome,
        telefone: formatarTelefone(l.telefone),
        email: l.email,
        tipoPessoa: l.tipoPessoa,
        empresa: l.empresa,
        cidade: l.cidade,
        uf: l.uf,
        origem: l.origem,
        orgao: nomeOrgao(l.orgao),
        tipoVeiculo: nomeVeiculo(l.tipoVeiculo),
        dataApreensao: data(l.dataApreensao),
        servicoInteresse: l.servicoInteresse,
        valorEstimado: l.valorEstimado ? numeroBR(l.valorEstimado) : '',
        etapa: ETAPAS.find((e) => e.id === l.etapa)?.nome,
        prioridade: l.prioridade ? 'Sim' : 'Não',
        motivoPerda: l.motivoPerda,
        proximaAcao: l.proximaAcao ? `${data(l.proximaAcao.dataHora)} ${l.proximaAcao.dataHora.slice(11, 16)}` : '',
        ultimoContatoEm: l.ultimoContatoEm ? data(l.ultimoContatoEm) : '',
        vendedor: nomesVendedores[l.vendedorId] ?? '',
        criadoEm: data(l.criadoEm),
      })),
    )
    baixarCsv(`leads-${hojeISO()}.csv`, csv)
  }

  return (
    <Pagina
      titulo="Leads"
      subtitulo={`${filtrados.length} de ${leads.length} leads${escopo ? '' : ' do time'}`}
      acoes={
        <>
          <Botao variante="fantasma" tamanho="sm" onClick={exportar} icone={<Download className="h-4 w-4" />} disabled={!filtrados.length}>
            Exportar CSV
          </Botao>
          <Botao variante="secundario" tamanho="sm" onClick={() => navegar('/leads/importar')} icone={<Upload className="h-4 w-4" />}>
            Importar
          </Botao>
          <Botao variante="primario" tamanho="sm" onClick={() => navegar('/leads/novo')} icone={<Plus className="h-4 w-4" />}>
            Novo lead
          </Botao>
        </>
      }
    >
      <Particulas ativo={celebrar} aoTerminar={() => setCelebrar(false)} />
      <motion.div variants={itemCascata} className="flex flex-col gap-3 md:flex-row md:items-center">
        <Entrada aria-label="Buscar leads" placeholder="Buscar por nome, empresa, telefone" prefixo={<Search className="h-4 w-4" />} value={busca} onChange={(e) => setBusca(e.target.value)} className="md:max-w-sm" />
        <div className="flex flex-wrap items-center gap-2">
          <Segmentado
            rotuloAria="Visão"
            valor={visao}
            aoMudar={setVisao}
            opcoes={[
              { valor: 'kanban', nome: 'Funil', icone: <KanbanSquare className="h-4 w-4" /> },
              { valor: 'lista', nome: 'Lista', icone: <List className="h-4 w-4" /> },
            ]}
          />
          {veTudo && (
            <Selecao aria-label="Vendedor" className="w-44" opcoes={[{ valor: 'todos', nome: 'Todo o time' }, ...equipe.filter((u) => u.ativo).map((u) => ({ valor: u.id, nome: u.nome }))]} value={vendedorFiltro} onChange={(e) => setVendedorFiltro(e.target.value)} />
          )}
          {visao === 'lista' && (
            <Selecao aria-label="Etapa" className="w-44" vazio="Todas as etapas" opcoes={ETAPAS.map((e) => ({ valor: e.id, nome: e.nome }))} value={etapaFiltro} onChange={(e) => setEtapaFiltro(e.target.value as Etapa | '')} />
          )}
          <Selecao aria-label="Origem" className="w-44" vazio="Todas as origens" opcoes={config.listas.origens.map((o) => ({ valor: o, nome: o }))} value={origemFiltro} onChange={(e) => setOrigemFiltro(e.target.value)} />
          <Botao tamanho="sm" variante={somentePrioridade ? 'primario' : 'secundario'} onClick={() => setSomentePrioridade((v) => !v)} aria-pressed={somentePrioridade}>
            PJ / frota
          </Botao>
        </div>
      </motion.div>

      <motion.div variants={itemCascata}>
        {erro && <p className="mb-3 text-sm text-[#f0c27a]">{erro}</p>}
        {carregando && leads.length === 0 ? (
          <EsqueletoLista itens={5} />
        ) : leads.length === 0 ? (
          <EstadoVazio
            icone={<Users className="h-5 w-5" />}
            titulo="Cadastre seu primeiro lead"
            descricao="Só nome e telefone são obrigatórios. Você também pode importar a planilha do Meta Ads."
            acao={
              <div className="flex gap-2">
                <Botao variante="primario" onClick={() => navegar('/leads/novo')} icone={<Plus className="h-4 w-4" />}>
                  Novo lead
                </Botao>
                <Botao variante="secundario" onClick={() => navegar('/leads/importar')} icone={<Upload className="h-4 w-4" />}>
                  Importar CSV
                </Botao>
              </div>
            }
          />
        ) : visao === 'kanban' ? (
          <Kanban leads={filtrados} nomesVendedores={escopo ? undefined : nomesVendedores} aoPedirPerda={setLeadPerda} aoPedirGanho={(l) => void pedirGanho(l)} />
        ) : filtrados.length === 0 ? (
          <EstadoVazio titulo="Nenhum lead com esses filtros" descricao="Ajuste a busca ou os filtros." />
        ) : (
          <ListaLeads leads={filtrados} nomesVendedores={escopo ? undefined : nomesVendedores} />
        )}
      </motion.div>

      <ModalPerda lead={leadPerda} aberto={!!leadPerda} aoFechar={() => setLeadPerda(null)} />
    </Pagina>
  )
}
