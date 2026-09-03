import { Navigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Botao, Monograma } from '@/components/ui'
import { useAuth } from './AuthProvider'

export function PaginaSemAcesso() {
  const { estado, firebaseUser, motivoSemAcesso, sair } = useAuth()
  if (estado === 'ok') return <Navigate to="/" replace />
  if (estado === 'deslogado') return <Navigate to="/entrar" replace />
  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="vidro-2 rounded-xl p-8 max-w-md w-full text-center flex flex-col items-center gap-4">
        <Monograma tamanho={56} />
        <div className="h-11 w-11 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-prata-2">
          <Lock className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-semibold text-platina">Acesso não autorizado</h1>
        <p className="text-sm text-prata-2">
          {motivoSemAcesso ??
            `O e-mail ${firebaseUser?.email ?? ''} ainda não foi cadastrado na equipe. Peça ao administrador para convidar você na aba Equipe e entre de novo.`}
        </p>
        <Botao variante="secundario" onClick={() => void sair()}>
          Sair e entrar com outra conta
        </Botao>
      </div>
    </div>
  )
}
