import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { collection, doc, getDoc, getDocs, onSnapshot, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db, deDoc, googleProvider, normalizarEmail } from '@/lib/firebase'
import { COMISSAO_PADRAO, GERAL_PADRAO, LISTAS_PADRAO, type ConfigComissao, type ConfigGeral, type ConfigListas, type Convite, type Usuario } from '@/lib/tipos'
import { carregarDadosExemplo } from '@/features/admin/dadosExemplo'

const DEMO = import.meta.env.VITE_DEMO === '1'

// Nome informado no cadastro por e-mail: onAuthStateChanged dispara antes do updateProfile.
let nomePendente = ''

export type EstadoAuth = 'carregando' | 'deslogado' | 'sem_acesso' | 'ok'

export interface Configuracoes {
  comissao: ConfigComissao
  listas: ConfigListas
  geral: ConfigGeral
}

interface AuthCtx {
  estado: EstadoAuth
  firebaseUser: User | null
  usuario: Usuario | null
  motivoSemAcesso: string | null
  config: Configuracoes
  equipe: Usuario[]
  ehAdmin: boolean
  ehGestor: boolean
  veTudo: boolean
  entrarComEmail: (email: string, senha: string) => Promise<void>
  criarContaComEmail: (nome: string, email: string, senha: string) => Promise<void>
  entrarComGoogle: () => Promise<void>
  recuperarSenha: (email: string) => Promise<void>
  sair: () => Promise<void>
  recarregarConfig: () => Promise<void>
  recarregarEquipe: () => Promise<void>
  atualizarUsuarioLocal: (parcial: Partial<Usuario>) => void
}

const Ctx = createContext<AuthCtx | null>(null)

async function carregarConfig(): Promise<Configuracoes> {
  const [c, l, g] = await Promise.all([
    getDoc(doc(db, 'configuracoes', 'comissao')),
    getDoc(doc(db, 'configuracoes', 'listas')),
    getDoc(doc(db, 'configuracoes', 'geral')),
  ])
  return {
    comissao: c.exists() ? { ...COMISSAO_PADRAO, ...(c.data() as Partial<ConfigComissao>) } : COMISSAO_PADRAO,
    listas: l.exists() ? { ...LISTAS_PADRAO, ...(l.data() as Partial<ConfigListas>) } : LISTAS_PADRAO,
    geral: g.exists() ? { ...GERAL_PADRAO, ...(g.data() as Partial<ConfigGeral>) } : GERAL_PADRAO,
  }
}

/**
 * Resolve o documento usuarios/{uid}. Se não existir:
 *  1. bootstrap: sem configuracoes/sistema, o primeiro autenticado vira administrador;
 *  2. convite: se houver convites/{email}, cria o usuário com o papel do convite;
 *  3. caso contrário, acesso não autorizado.
 */
async function resolverUsuario(u: User): Promise<{ usuario: Usuario | null; motivo: string | null }> {
  const ref = doc(db, 'usuarios', u.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    const usuario = deDoc<Usuario>(snap)
    if (!usuario.ativo) return { usuario: null, motivo: 'Sua conta está desativada. Fale com o administrador.' }
    return { usuario, motivo: null }
  }
  const email = normalizarEmail(u.email ?? '')
  const nome = u.displayName?.trim() || nomePendente.trim() || email.split('@')[0] || 'Usuário'

  const sistema = await getDoc(doc(db, 'configuracoes', 'sistema'))
  if (!sistema.exists()) {
    const lote = writeBatch(db)
    const novo = {
      nome,
      email,
      papel: 'admin',
      faixa: 'Inicial',
      fotoUrl: u.photoURL ?? '',
      ativo: true,
      metaMensalRecebido: GERAL_PADRAO.metaPadraoRecebido,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    }
    lote.set(ref, novo)
    lote.set(doc(db, 'configuracoes', 'sistema'), { bootstrapConcluido: true, adminInicial: u.uid, criadoEm: serverTimestamp() })
    lote.set(doc(db, 'configuracoes', 'comissao'), COMISSAO_PADRAO)
    lote.set(doc(db, 'configuracoes', 'listas'), LISTAS_PADRAO)
    lote.set(doc(db, 'configuracoes', 'geral'), GERAL_PADRAO)
    try {
      await lote.commit()
      const criado = await getDoc(ref)
      const usuario = deDoc<Usuario>(criado)
      // Na demonstração, o primeiro acesso já vem com dados de exemplo para mostrar o app.
      if (DEMO) await carregarDadosExemplo([usuario], LISTAS_PADRAO.servicos).catch(() => undefined)
      return { usuario, motivo: null }
    } catch {
      // Outro usuário concluiu o bootstrap ao mesmo tempo; segue para o convite.
    }
  }

  if (!email) return { usuario: null, motivo: 'Sua conta não tem e-mail. Use e-mail e senha ou uma conta Google com e-mail.' }
  const convSnap = await getDoc(doc(db, 'convites', email))
  if (!convSnap.exists()) return { usuario: null, motivo: null }
  const convite = convSnap.data() as Convite
  const novo = {
    nome: convite.nome?.trim() || nome,
    email,
    papel: convite.papel,
    faixa: convite.faixa ?? 'Inicial',
    fotoUrl: u.photoURL ?? '',
    ativo: true,
    metaMensalRecebido: convite.metaMensalRecebido ?? GERAL_PADRAO.metaPadraoRecebido,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  }
  await setDoc(ref, novo)
  await updateDoc(doc(db, 'convites', email), { aceitoEm: new Date().toISOString(), uid: u.uid }).catch(() => undefined)
  const criado = await getDoc(ref)
  return { usuario: deDoc<Usuario>(criado), motivo: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>('carregando')
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [config, setConfig] = useState<Configuracoes>({ comissao: COMISSAO_PADRAO, listas: LISTAS_PADRAO, geral: GERAL_PADRAO })
  const [equipe, setEquipe] = useState<Usuario[]>([])

  const recarregarConfig = useCallback(async () => {
    try {
      setConfig(await carregarConfig())
    } catch (e) {
      console.warn('Falha ao carregar configurações', e)
    }
  }, [])

  const recarregarEquipe = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'usuarios'))
      setEquipe(snap.docs.map((d) => deDoc<Usuario>(d)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
    } catch (e) {
      console.warn('Falha ao carregar equipe', e)
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    const parar = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u)
      if (!u) {
        setUsuario(null)
        setMotivo(null)
        setEstado('deslogado')
        return
      }
      setEstado('carregando')
      try {
        const r = await resolverUsuario(u)
        if (cancelado) return
        if (!r.usuario) {
          setUsuario(null)
          setMotivo(r.motivo)
          setEstado('sem_acesso')
          return
        }
        setUsuario(r.usuario)
        await Promise.all([recarregarConfig(), recarregarEquipe()])
        if (cancelado) return
        setEstado('ok')
      } catch (e) {
        console.error('Falha ao resolver usuário', e)
        if (cancelado) return
        setMotivo('Não foi possível verificar seu acesso. Verifique a conexão e tente de novo.')
        setEstado('sem_acesso')
      }
    })
    return () => {
      cancelado = true
      parar()
    }
  }, [recarregarConfig, recarregarEquipe])

  // Mantém o próprio perfil em tempo real (papel, faixa e meta mudam pelo administrador).
  useEffect(() => {
    if (!firebaseUser || estado !== 'ok') return
    return onSnapshot(doc(db, 'usuarios', firebaseUser.uid), (snap) => {
      if (snap.exists()) setUsuario(deDoc<Usuario>(snap))
    })
  }, [firebaseUser, estado])

  const valor = useMemo<AuthCtx>(() => {
    const papel = usuario?.papel
    return {
      estado,
      firebaseUser,
      usuario,
      motivoSemAcesso: motivo,
      config,
      equipe,
      ehAdmin: papel === 'admin',
      ehGestor: papel === 'gestor',
      veTudo: papel === 'admin' || papel === 'gestor',
      entrarComEmail: async (email, senha) => {
        await signInWithEmailAndPassword(auth, normalizarEmail(email), senha)
      },
      criarContaComEmail: async (nome, email, senha) => {
        nomePendente = nome
        const cred = await createUserWithEmailAndPassword(auth, normalizarEmail(email), senha)
        if (nome.trim()) await updateProfile(cred.user, { displayName: nome.trim() })
      },
      entrarComGoogle: async () => {
        await signInWithPopup(auth, googleProvider)
      },
      recuperarSenha: async (email) => {
        await sendPasswordResetEmail(auth, normalizarEmail(email))
      },
      sair: async () => {
        await signOut(auth)
      },
      recarregarConfig,
      recarregarEquipe,
      atualizarUsuarioLocal: (parcial) => setUsuario((u) => (u ? { ...u, ...parcial } : u)),
    }
  }, [estado, firebaseUser, usuario, motivo, config, equipe, recarregarConfig, recarregarEquipe])

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}

/** Usuário garantido (só usar dentro de rotas protegidas). */
export function useUsuario(): Usuario {
  const { usuario } = useAuth()
  if (!usuario) throw new Error('Usuário não autenticado')
  return usuario
}

export function mensagemErroAuth(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? ''
  const mapa: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Usuário desativado.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já tem conta. Entre com a senha.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.',
    'auth/operation-not-allowed': 'Este método de login não está ativado no Firebase.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    'auth/unauthorized-domain': 'Este domínio não está autorizado no Firebase Authentication.',
  }
  return mapa[codigo] ?? 'Não foi possível entrar. Tente de novo.'
}
