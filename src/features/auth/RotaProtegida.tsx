import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Esqueleto } from '@/components/ui'
import { useAuth } from './AuthProvider'

export function RotaProtegida({ apenasAdmin, apenasGestao }: { apenasAdmin?: boolean; apenasGestao?: boolean }) {
  const { estado, ehAdmin, veTudo } = useAuth()
  const local = useLocation()
  if (estado === 'carregando') return <TelaCarregando />
  if (estado === 'deslogado') return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  if (estado === 'sem_acesso') return <Navigate to="/sem-acesso" replace />
  if (apenasAdmin && !ehAdmin) return <Navigate to="/" replace />
  if (apenasGestao && !veTudo) return <Navigate to="/" replace />
  return <Outlet />
}

export function TelaCarregando() {
  return (
    <div className="min-h-dvh flex items-center justify-center" aria-busy>
      <div className="w-full max-w-md px-6 space-y-3">
        <Esqueleto className="h-8 w-1/2" />
        <Esqueleto className="h-32 w-full rounded-lg" />
        <Esqueleto className="h-4 w-2/3" />
      </div>
    </div>
  )
}
