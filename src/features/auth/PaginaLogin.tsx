import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { LogIn, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { Botao, Entrada, Monograma, useToast } from '@/components/ui'
import { cascata, itemCascata } from '@/lib/motion'
import { firebaseConfigurado } from '@/lib/firebase'
import { mensagemErroAuth, useAuth } from './AuthProvider'

type Modo = 'entrar' | 'criar' | 'recuperar'

export function PaginaLogin() {
  const { estado, entrarComEmail, criarContaComEmail, entrarComGoogle, recuperarSenha, config } = useAuth()
  const toast = useToast()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  if (estado === 'ok') return <Navigate to="/" replace />
  if (estado === 'sem_acesso') return <Navigate to="/sem-acesso" replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)
    try {
      if (modo === 'entrar') await entrarComEmail(email, senha)
      else if (modo === 'criar') await criarContaComEmail(nome, email, senha)
      else {
        await recuperarSenha(email)
        toast.sucesso('E-mail enviado', 'Veja sua caixa de entrada para redefinir a senha.')
        setModo('entrar')
      }
    } catch (err) {
      setErro(mensagemErroAuth(err))
    } finally {
      setCarregando(false)
    }
  }

  async function google() {
    setErro(null)
    setCarregando(true)
    try {
      await entrarComGoogle()
    } catch (err) {
      setErro(mensagemErroAuth(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/2 top-[30%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(91,124,255,0.18),transparent_60%)] blur-2xl" />
      </div>
      <motion.div variants={cascata(0.1)} initial="oculto" animate="visivel" className="relative w-full max-w-[400px]">
        <motion.div variants={itemCascata} className="flex flex-col items-center gap-4 mb-8">
          <Monograma tamanho={72} />
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight texto-prata">{config.geral.nomeApp}</h1>
            <p className="mt-1 text-sm text-prata-2">Pedrini & Azevedo Advogados Associados</p>
          </div>
        </motion.div>

        <motion.form variants={itemCascata} onSubmit={enviar} className="vidro-2 rounded-xl p-6 sm:p-7 flex flex-col gap-4">
          {!firebaseConfigurado && (
            <p className="rounded-sm border border-atrasado/40 bg-atrasado/10 px-3 py-2 text-xs text-[#f0c27a]">
              Firebase não configurado. Preencha as variáveis VITE_FIREBASE_* no ambiente.
            </p>
          )}
          <h2 className="text-lg font-semibold text-platina">
            {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Recuperar senha'}
          </h2>
          {modo === 'criar' && <Entrada rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required />}
          <Entrada rotulo="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
          {modo !== 'recuperar' && (
            <Entrada
              rotulo="Senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          )}
          {erro && (
            <p role="alert" className="text-sm text-[#ff8a8e]">
              {erro}
            </p>
          )}
          <Botao type="submit" variante="primario" tamanho="lg" largura="total" carregando={carregando} icone={modo === 'criar' ? <UserPlus className="h-4 w-4" /> : modo === 'recuperar' ? <Mail className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}>
            {modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar e-mail'}
          </Botao>
          {modo !== 'recuperar' && (
            <>
              <div className="flex items-center gap-3 text-xs text-prata-3">
                <span className="h-px flex-1 bg-white/[0.08]" />
                ou
                <span className="h-px flex-1 bg-white/[0.08]" />
              </div>
              <Botao type="button" variante="secundario" tamanho="lg" largura="total" onClick={google} disabled={carregando} icone={<IconeGoogle />}>
                Continuar com Google
              </Botao>
            </>
          )}
          <div className="flex flex-wrap justify-between gap-2 text-xs text-prata-2 mt-1">
            {modo === 'entrar' ? (
              <>
                <button type="button" className="hover:text-platina cursor-pointer" onClick={() => setModo('criar')}>
                  Primeiro acesso? Criar conta
                </button>
                <button type="button" className="hover:text-platina cursor-pointer" onClick={() => setModo('recuperar')}>
                  Esqueci a senha
                </button>
              </>
            ) : (
              <button type="button" className="hover:text-platina cursor-pointer" onClick={() => setModo('entrar')}>
                Já tenho conta. Entrar
              </button>
            )}
          </div>
        </motion.form>

        <motion.p variants={itemCascata} className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-prata-3">
          <ShieldCheck className="h-3.5 w-3.5" /> Acesso por convite. Só e-mails cadastrados pelo administrador entram.
        </motion.p>
      </motion.div>
    </div>
  )
}

function IconeGoogle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  )
}
