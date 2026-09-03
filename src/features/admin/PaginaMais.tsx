import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Settings2, Download, User, Shield, Sparkles } from 'lucide-react'
import { Avatar, Botao, Cartao, Entrada, Modal, useToast } from '@/components/ui'
import { Pagina } from '@/components/layout/Pagina'
import { useAuth, useUsuario } from '@/features/auth/AuthProvider'
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { moeda } from '@/lib/formatos'
import { MODELO_GEMINI, geminiDisponivel } from '@/lib/gemini'

export function PaginaMais() {
  const usuario = useUsuario()
  const { sair, ehAdmin, config } = useAuth()
  const navegar = useNavigate()
  const toast = useToast()
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(usuario.nome)
  const [foto, setFoto] = useState(usuario.fotoUrl ?? '')
  const papel = { admin: 'Administrador', gestor: 'Gestor', vendedor: 'Vendedor' }[usuario.papel]

  async function salvarPerfil() {
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), { nome: nome.trim(), fotoUrl: foto.trim(), atualizadoEm: serverTimestamp() })
      toast.sucesso('Perfil atualizado')
      setEditando(false)
    } catch {
      toast.erro('Não foi possível salvar')
    }
  }

  const Item = ({ icone, titulo, descricao, aoClicar }: { icone: React.ReactNode; titulo: string; descricao?: string; aoClicar: () => void }) => (
    <button onClick={aoClicar} className="flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left hover:bg-white/[0.05] transition-colors cursor-pointer min-h-[56px]">
      <span className="text-prata-2">{icone}</span>
      <span className="flex-1">
        <span className="block text-[15px] text-platina">{titulo}</span>
        {descricao && <span className="block text-xs text-prata-3">{descricao}</span>}
      </span>
      <ChevronRight className="h-4 w-4 text-prata-3" />
    </button>
  )

  return (
    <Pagina titulo="Mais">
      <Cartao className="p-5 flex items-center gap-4" brilho={false}>
        <Avatar nome={usuario.nome} fotoUrl={usuario.fotoUrl} tamanho={56} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-platina">{usuario.nome}</p>
          <p className="truncate text-sm text-prata-2">{usuario.email}</p>
          <p className="text-xs text-prata-3 mt-0.5">
            {papel} · Faixa {usuario.faixa} · Meta {moeda(usuario.metaMensalRecebido)}
          </p>
        </div>
        <Botao variante="secundario" tamanho="sm" onClick={() => setEditando(true)} icone={<User className="h-4 w-4" />}>
          Editar
        </Botao>
      </Cartao>

      <Cartao className="p-1.5 flex flex-col" brilho={false}>
        {ehAdmin && <Item icone={<Settings2 className="h-5 w-5" />} titulo="Administração" descricao="Equipe, comissão, listas, reatribuição e dados de exemplo" aoClicar={() => navegar('/admin')} />}
        <Item icone={<Download className="h-5 w-5" />} titulo="Exportar dados" descricao="CSV de leads, vendas e parcelas nas listas de cada tela" aoClicar={() => navegar('/vendas')} />
        <Item icone={<Shield className="h-5 w-5" />} titulo="Privacidade" descricao="Só guardamos o necessário para vender e cobrar. Senhas de clientes nunca são armazenadas." aoClicar={() => toast.info('LGPD', 'Dados sensíveis desnecessários não são coletados.')} />
        <Item icone={<Sparkles className="h-5 w-5" />} titulo={`Assistente ${config.geral.nomeAssistente}`} descricao={geminiDisponivel() ? `Gemini ativo (${MODELO_GEMINI})` : 'Sem chave do Gemini: briefing gerado localmente'} aoClicar={() => navegar('/')} />
      </Cartao>

      <Botao variante="fantasma" className="self-start text-[#ff8a8e]" onClick={() => void sair()} icone={<LogOut className="h-4 w-4" />}>
        Sair
      </Botao>

      <Modal aberto={editando} aoFechar={() => setEditando(false)} titulo="Editar perfil" largura="sm" rodape={<Botao variante="primario" onClick={() => void salvarPerfil()}>Salvar</Botao>}>
        <div className="flex flex-col gap-4">
          <Entrada rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Entrada rotulo="URL da foto" value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="https://" />
        </div>
      </Modal>
    </Pagina>
  )
}
