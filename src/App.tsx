import { Component, lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ToastProvider } from '@/components/ui'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { PaginaLogin } from '@/features/auth/PaginaLogin'
import { PaginaSemAcesso } from '@/features/auth/PaginaSemAcesso'
import { RotaProtegida, TelaCarregando } from '@/features/auth/RotaProtegida'
import { AppShell } from '@/components/layout/AppShell'
import { PaginaInicio } from '@/features/briefing/PaginaInicio'

const PaginaLeads = lazy(() => import('@/features/leads/PaginaLeads').then((m) => ({ default: m.PaginaLeads })))
const PaginaLead = lazy(() => import('@/features/leads/PaginaLead').then((m) => ({ default: m.PaginaLead })))
const PaginaNovoLead = lazy(() => import('@/features/leads/PaginaNovoLead').then((m) => ({ default: m.PaginaNovoLead })))
const PaginaImportar = lazy(() => import('@/features/leads/PaginaImportar').then((m) => ({ default: m.PaginaImportar })))
const PaginaVendas = lazy(() => import('@/features/vendas/PaginaVendas').then((m) => ({ default: m.PaginaVendas })))
const PaginaNovaVenda = lazy(() => import('@/features/vendas/PaginaNovaVenda').then((m) => ({ default: m.PaginaNovaVenda })))
const PaginaVenda = lazy(() => import('@/features/vendas/PaginaVenda').then((m) => ({ default: m.PaginaVenda })))
const PaginaMetas = lazy(() => import('@/features/metas/PaginaMetas').then((m) => ({ default: m.PaginaMetas })))
const PaginaMais = lazy(() => import('@/features/admin/PaginaMais').then((m) => ({ default: m.PaginaMais })))
const PaginaAdmin = lazy(() => import('@/features/admin/PaginaAdmin').then((m) => ({ default: m.PaginaAdmin })))

const DEMO = import.meta.env.VITE_DEMO === '1'

class LimiteErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state = { erro: null as Error | null }
  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }
  componentDidCatch(erro: Error) {
    console.error(erro)
  }
  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="vidro-2 rounded-xl p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-platina">Algo deu errado nesta tela</h1>
          <p className="mt-1 text-sm text-prata-2">Recarregue a página. Se continuar, avise o administrador.</p>
          <button onClick={() => window.location.reload()} className="mt-4 h-11 rounded-sm bg-white/[0.08] px-4 text-sm font-semibold text-platina cursor-pointer">
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}

export function App() {
  const Roteador = DEMO ? HashRouter : BrowserRouter
  return (
    <MotionConfig reducedMotion="user">
      <LimiteErro>
      <ToastProvider>
        <AuthProvider>
          {DEMO && (
            <div className="bg-atrasado/15 border-b border-atrasado/30 px-4 py-1.5 text-center text-[12px] text-[#f0c27a]">
              Versão de demonstração. Os dados ficam só neste navegador e podem ser apagados a qualquer momento.
            </div>
          )}
          <Roteador>
            <Suspense fallback={<TelaCarregando />}>
              <Routes>
                <Route path="/entrar" element={<PaginaLogin />} />
                <Route path="/sem-acesso" element={<PaginaSemAcesso />} />
                <Route element={<RotaProtegida />}>
                  <Route element={<AppShell />}>
                    <Route index element={<PaginaInicio />} />
                    <Route path="/leads" element={<PaginaLeads />} />
                    <Route path="/leads/novo" element={<PaginaNovoLead />} />
                    <Route path="/leads/importar" element={<PaginaImportar />} />
                    <Route path="/leads/:id" element={<PaginaLead />} />
                    <Route path="/vendas" element={<PaginaVendas />} />
                    <Route path="/vendas/nova" element={<PaginaNovaVenda />} />
                    <Route path="/vendas/:id" element={<PaginaVenda />} />
                    <Route path="/metas" element={<PaginaMetas />} />
                    <Route path="/mais" element={<PaginaMais />} />
                    <Route element={<RotaProtegida apenasAdmin />}>
                      <Route path="/admin" element={<PaginaAdmin />} />
                      <Route path="/admin/:aba" element={<PaginaAdmin />} />
                    </Route>
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Roteador>
        </AuthProvider>
      </ToastProvider>
      </LimiteErro>
    </MotionConfig>
  )
}
