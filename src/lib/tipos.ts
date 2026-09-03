// Tipos do domínio. Coleções em português, conforme o modelo de dados.
// Datas de negócio são ISO 8601 (string) para facilitar consultas por intervalo,
// serialização para o assistente e exportação. criadoEm/atualizadoEm são
// Timestamps do Firestore (serverTimestamp) convertidos para ISO na leitura.

export type Papel = 'admin' | 'gestor' | 'vendedor'
export type Faixa = 'Inicial' | 'Pleno' | 'Sênior'

export interface Usuario {
  id: string
  nome: string
  email: string
  papel: Papel
  faixa: Faixa
  fotoUrl?: string
  ativo: boolean
  metaMensalRecebido: number
  criadoEm?: string
  atualizadoEm?: string
}

export interface Convite {
  email: string
  nome: string
  papel: Papel
  faixa?: Faixa
  metaMensalRecebido?: number
  convidadoPor: string
  aceitoEm?: string | null
  criadoEm?: string
}

export type Etapa =
  | 'novo'
  | 'contato_feito'
  | 'qualificado'
  | 'proposta_enviada'
  | 'negociacao'
  | 'ganho'
  | 'perdido'

export const ETAPAS: { id: Etapa; nome: string }[] = [
  { id: 'novo', nome: 'Novo' },
  { id: 'contato_feito', nome: 'Contato feito' },
  { id: 'qualificado', nome: 'Qualificado' },
  { id: 'proposta_enviada', nome: 'Proposta enviada' },
  { id: 'negociacao', nome: 'Negociação' },
  { id: 'ganho', nome: 'Ganho' },
  { id: 'perdido', nome: 'Perdido' },
]

export const ETAPAS_ABERTAS: Etapa[] = ['novo', 'contato_feito', 'qualificado', 'proposta_enviada', 'negociacao']

export type TipoPessoa = 'PF' | 'PJ'
export type Orgao = 'receita_federal' | 'prf' | 'bpfron' | 'outro' | 'fora_de_escopo'
export type TipoVeiculo = 'carro' | 'caminhao' | 'onibus' | 'frota' | 'moto' | 'outro'

export const ORGAOS: { id: Orgao; nome: string }[] = [
  { id: 'receita_federal', nome: 'Receita Federal' },
  { id: 'prf', nome: 'PRF' },
  { id: 'bpfron', nome: 'BPFron' },
  { id: 'outro', nome: 'Outro' },
  { id: 'fora_de_escopo', nome: 'Fora de escopo' },
]

export const TIPOS_VEICULO: { id: TipoVeiculo; nome: string }[] = [
  { id: 'carro', nome: 'Carro' },
  { id: 'caminhao', nome: 'Caminhão' },
  { id: 'onibus', nome: 'Ônibus' },
  { id: 'frota', nome: 'Frota' },
  { id: 'moto', nome: 'Moto' },
  { id: 'outro', nome: 'Outro' },
]

export const DOCUMENTOS_OPCOES = ['RG ou CNH', 'CRLV', 'Auto de infração', 'Nota fiscal da carga', 'Comprovante de endereço', 'Contrato social']

export type TipoProximaAcao = 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'cobranca' | 'outro'

export interface ProximaAcao {
  tipo: TipoProximaAcao
  dataHora: string
  descricao?: string
}

export interface Lead {
  id: string
  vendedorId: string
  nome: string
  telefone: string
  email?: string
  tipoPessoa: TipoPessoa
  empresa?: string
  cidade?: string
  uf?: string
  origem?: string
  orgao?: Orgao
  tipoVeiculo?: TipoVeiculo
  dataApreensao?: string
  localApreensao?: string
  carga?: string
  autoInfracao?: boolean
  documentosEmMaos?: string[]
  servicoInteresse?: string
  valorEstimado?: number
  observacoes?: string
  etapa: Etapa
  qualificado: boolean
  prioridade: boolean
  motivoPerda?: string
  proximaAcao?: ProximaAcao | null
  ultimoContatoEm?: string | null
  tags: string[]
  ordem?: number
  criadoEm?: string
  atualizadoEm?: string
}

export type TipoInteracao = 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'anotacao'
export type ResultadoInteracao = 'atendeu' | 'nao_atendeu' | 'caixa_postal' | 'retorno_agendado' | 'sem_interesse' | 'n_a'

export const TIPOS_INTERACAO: { id: TipoInteracao; nome: string }[] = [
  { id: 'ligacao', nome: 'Ligação' },
  { id: 'whatsapp', nome: 'WhatsApp' },
  { id: 'email', nome: 'E-mail' },
  { id: 'reuniao', nome: 'Reunião' },
  { id: 'anotacao', nome: 'Anotação' },
]

export const RESULTADOS_INTERACAO: { id: ResultadoInteracao; nome: string }[] = [
  { id: 'atendeu', nome: 'Atendeu' },
  { id: 'nao_atendeu', nome: 'Não atendeu' },
  { id: 'caixa_postal', nome: 'Caixa postal' },
  { id: 'retorno_agendado', nome: 'Retorno agendado' },
  { id: 'sem_interesse', nome: 'Sem interesse' },
]

export interface Interacao {
  id: string
  vendedorId: string
  tipo: TipoInteracao
  resultado: ResultadoInteracao
  resumo: string
  dataHora: string
  duracaoMin?: number
  criadoEm?: string
}

export type FormaPagamento = 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro'

export const FORMAS_PAGAMENTO: { id: FormaPagamento; nome: string }[] = [
  { id: 'pix', nome: 'Pix' },
  { id: 'boleto', nome: 'Boleto' },
  { id: 'cartao', nome: 'Cartão' },
  { id: 'transferencia', nome: 'Transferência' },
  { id: 'dinheiro', nome: 'Dinheiro' },
]

export interface Venda {
  id: string
  vendedorId: string
  leadId: string
  clienteNome: string
  tipoPessoa: TipoPessoa
  servico: string
  valorTotal: number
  entrada: number
  formaPagamento: FormaPagamento
  numParcelas: number
  primeiroVencimento: string
  dataFechamento: string
  status: 'ativa' | 'cancelada'
  observacoes?: string
  criadoEm?: string
  atualizadoEm?: string
}

export type StatusParcela = 'previsto' | 'recebido'
export type StatusParcelaCalculado = 'previsto' | 'recebido' | 'atrasado'

export interface Parcela {
  id: string
  vendaId: string
  vendedorId: string
  clienteNome: string
  numero: number
  valor: number
  vencimento: string
  status: StatusParcela
  dataRecebimento?: string | null
  valorRecebido?: number | null
  formaPagamento?: FormaPagamento
  criadoEm?: string
  atualizadoEm?: string
}

export interface Meta {
  vendedorId: string
  mes: string
  metaRecebido: number
  metaVendas?: number
  metaContatos?: number
}

export interface FaixaFixo {
  nome: Faixa
  valorFixo: number
  minimoVendido: number
}

export interface ConfigComissao {
  percentualVendedorRecebido: number
  faixasFixo: FaixaFixo[]
  percentualCoordenadorContratos: number
  vigenteDesde: string
}

export interface ConfigListas {
  servicos: string[]
  origens: string[]
  motivosPerda: string[]
}

export interface ConfigGeral {
  nomeApp: string
  nomeAssistente: string
  sabadoUtil: boolean
  metaPadraoRecebido: number
}

export interface Briefing {
  vendedorId: string
  data: string
  texto: string
  geradoEm: string
  origem: 'gemini' | 'local'
  dadosResumo: Record<string, unknown>
}

export const COMISSAO_PADRAO: ConfigComissao = {
  percentualVendedorRecebido: 3,
  faixasFixo: [
    { nome: 'Inicial', valorFixo: 1500, minimoVendido: 0 },
    { nome: 'Pleno', valorFixo: 2000, minimoVendido: 50000 },
    { nome: 'Sênior', valorFixo: 2500, minimoVendido: 100000 },
  ],
  percentualCoordenadorContratos: 1,
  vigenteDesde: '2026-01-01',
}

export const LISTAS_PADRAO: ConfigListas = {
  servicos: ['Diligência', 'Defesa Administrativa', 'Judicial', 'Deslacração', 'Assessoria'],
  origens: [
    'Meta Ads ABERTO',
    'Meta Ads FORMS',
    'Meta Ads VENDAS',
    'Meta Ads PESADO FROTA',
    'Meta Ads CARRO BR',
    'Meta Ads PY',
    'Google',
    'Instagram',
    'Site',
    'Indicação',
    'Outro',
  ],
  motivosPerda: [
    'Fora de escopo: banco, financiamento, IPVA ou multa',
    'Sem resposta',
    'Preço',
    'Fechou com outro',
    'Desistiu',
    'Outro',
  ],
}

export const GERAL_PADRAO: ConfigGeral = {
  nomeApp: 'Cockpit PA',
  nomeAssistente: 'Atlas',
  sabadoUtil: false,
  metaPadraoRecebido: 200000,
}
