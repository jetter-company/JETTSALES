import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
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

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
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
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
