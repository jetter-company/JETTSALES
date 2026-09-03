import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react'
import { Botao, Cartao, Selecao, useToast } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { lerCsv, sugerirColuna } from '@/lib/csv'
import { formatarTelefone, normalizarTelefone } from '@/lib/telefone'
import { importarLeads, type LeadImportado } from './dados'

export function PaginaImportar() {
  const navegar = useNavigate()
  const usuario = useUsuario()
  const { veTudo, equipe, config } = useAuth()
  const toast = useToast()
  const [cabecalho, setCabecalho] = useState<string[]>([])
  const [linhas, setLinhas] = useState<string[][]>([])
  const [mapa, setMapa] = useState({ nome: -1, telefone: -1, email: -1, origem: -1 })
  const [origemFixa, setOrigemFixa] = useState('')
  const [distribuicao, setDistribuicao] = useState<'eu' | 'rodizio' | string>('eu')
  const [importando, setImportando] = useState(false)

  async function lerArquivo(arquivo: File) {
    const texto = await arquivo.text()
    const { cabecalho: c, linhas: l } = lerCsv(texto)
    if (!c.length || !l.length) {
      toast.erro('Arquivo vazio ou sem cabeçalho')
      return
    }
    setCabecalho(c)
    setLinhas(l)
    setMapa({ nome: sugerirColuna(c, 'nome'), telefone: sugerirColuna(c, 'telefone'), email: sugerirColuna(c, 'email'), origem: sugerirColuna(c, 'origem') })
  }

  const ativos = useMemo(() => equipe.filter((u) => u.ativo && u.papel === 'vendedor'), [equipe])

  const previa = useMemo<LeadImportado[]>(() => {
    if (mapa.nome < 0 || mapa.telefone < 0) return []
    const vendedores = ativos.length ? ativos : [usuario]
    return linhas
      .map((l, i): LeadImportado | null => {
        const nome = (l[mapa.nome] ?? '').trim()
        const telefone = normalizarTelefone(l[mapa.telefone] ?? '')
        if (!nome || telefone.length < 12) return null
        let vendedorId = usuario.id
        if (veTudo && distribuicao === 'rodizio') vendedorId = vendedores[i % vendedores.length]?.id ?? usuario.id
        else if (veTudo && distribuicao !== 'eu') vendedorId = distribuicao
        return {
          nome,
          telefone,
          email: mapa.email >= 0 ? (l[mapa.email] ?? '').trim() : undefined,
          origem: origemFixa || (mapa.origem >= 0 ? (l[mapa.origem] ?? '').trim() : undefined),
          vendedorId,
        }
      })
      .filter((x): x is LeadImportado => x !== null)
  }, [linhas, mapa, origemFixa, distribuicao, veTudo, usuario, ativos])

  const ignoradas = linhas.length - previa.length

  async function importar() {
    if (!previa.length) return
    setImportando(true)
    try {
      const n = await importarLeads(previa)
      toast.sucesso(`${n} leads importados`)
      navegar('/leads')
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível importar')
    } finally {
      setImportando(false)
    }
  }

  const opcoesColuna = cabecalho.map((h, i) => ({ valor: String(i), nome: h || `Coluna ${i + 1}` }))
  const nomeVendedor = (id: string) => equipe.find((u) => u.id === id)?.nome.split(' ')[0] ?? ''

  return (
    <Pagina
      titulo="Importar leads"
      subtitulo="Planilha CSV exportada do Meta Ads ou de outra fonte."
      acoes={
        <Botao variante="fantasma" tamanho="sm" onClick={() => navegar('/leads')} icone={<ArrowLeft className="h-4 w-4" />}>
          Voltar
        </Botao>
      }
    >
      <div className="max-w-4xl flex flex-col gap-5">
        <Cartao className="p-5" brilho={false}>
          <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/[0.14] bg-white/[0.02] px-4 py-6 text-center text-sm text-prata-2 hover:bg-white/[0.04]">
            <FileSpreadsheet className="h-6 w-6" />
            <span>{cabecalho.length ? `${linhas.length} linhas carregadas. Clique para trocar o arquivo.` : 'Clique para escolher o arquivo CSV'}</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && void lerArquivo(e.target.files[0])} />
          </label>
        </Cartao>

        {cabecalho.length > 0 && (
          <>
            <Cartao className="p-5 flex flex-col gap-4" brilho={false}>
              <h2 className="text-sm font-semibold text-prata-2">Mapeamento das colunas</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Selecao rotulo="Nome" required vazio="Escolha a coluna" opcoes={opcoesColuna} value={mapa.nome >= 0 ? String(mapa.nome) : ''} onChange={(e) => setMapa((m) => ({ ...m, nome: Number(e.target.value) }))} />
                <Selecao rotulo="Telefone" required vazio="Escolha a coluna" opcoes={opcoesColuna} value={mapa.telefone >= 0 ? String(mapa.telefone) : ''} onChange={(e) => setMapa((m) => ({ ...m, telefone: Number(e.target.value) }))} />
                <Selecao rotulo="E-mail" vazio="Não importar" opcoes={opcoesColuna} value={mapa.email >= 0 ? String(mapa.email) : ''} onChange={(e) => setMapa((m) => ({ ...m, email: e.target.value === '' ? -1 : Number(e.target.value) }))} />
                <Selecao rotulo="Origem (coluna)" vazio="Não importar" opcoes={opcoesColuna} value={mapa.origem >= 0 ? String(mapa.origem) : ''} onChange={(e) => setMapa((m) => ({ ...m, origem: e.target.value === '' ? -1 : Number(e.target.value) }))} />
                <Selecao rotulo="Ou origem fixa para todos" vazio="Usar a coluna" opcoes={config.listas.origens.map((o) => ({ valor: o, nome: o }))} value={origemFixa} onChange={(e) => setOrigemFixa(e.target.value)} />
                {veTudo && (
                  <Selecao
                    rotulo="Dono dos leads"
                    opcoes={[{ valor: 'eu', nome: 'Eu' }, { valor: 'rodizio', nome: 'Distribuir em rodízio entre os vendedores' }, ...ativos.map((u) => ({ valor: u.id, nome: u.nome }))]}
                    value={distribuicao}
                    onChange={(e) => setDistribuicao(e.target.value)}
                  />
                )}
              </div>
            </Cartao>

            <Cartao className="p-5 flex flex-col gap-3" brilho={false}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-prata-2">Prévia</h2>
                <span className="text-xs text-prata-3">
                  {previa.length} válidos{ignoradas > 0 ? ` · ${ignoradas} ignorados (sem nome ou telefone)` : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-prata-3">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Nome</th>
                      <th className="py-2 pr-3 font-medium">Telefone</th>
                      <th className="py-2 pr-3 font-medium">E-mail</th>
                      <th className="py-2 pr-3 font-medium">Origem</th>
                      <th className="py-2 pr-3 font-medium">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previa.slice(0, 15).map((p, i) => (
                      <tr key={i} className="border-t border-white/[0.06] text-platina">
                        <td className="py-2 pr-3">{p.nome}</td>
                        <td className="py-2 pr-3 tabular">{formatarTelefone(p.telefone)}</td>
                        <td className="py-2 pr-3 text-prata-2">{p.email}</td>
                        <td className="py-2 pr-3 text-prata-2">{p.origem}</td>
                        <td className="py-2 pr-3 text-prata-2">{nomeVendedor(p.vendedorId) || 'Eu'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previa.length > 15 && <p className="mt-2 text-xs text-prata-3">Mostrando 15 de {previa.length}.</p>}
              </div>
            </Cartao>

            <div className="flex justify-end">
              <Botao variante="primario" tamanho="lg" onClick={() => void importar()} carregando={importando} disabled={!previa.length} icone={<Upload className="h-4 w-4" />}>
                Importar {previa.length} leads
              </Botao>
            </div>
          </>
        )}
      </div>
    </Pagina>
  )
}
