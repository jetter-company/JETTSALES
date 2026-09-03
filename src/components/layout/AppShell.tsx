import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Users, Receipt, Target, MoreHorizontal, Settings2, LogOut, Sparkles } from 'lucide-react'
import { Avatar, Monograma, cx } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'

const itens = [
  { para: '/', nome: 'Início', icone: Home, fim: true },
  { para: '/leads', nome: 'Leads', icone: Users },
  { para: '/vendas', nome: 'Vendas', icone: Receipt },
  { para: '/metas', nome: 'Metas', icone: Target },
  { para: '/mais', nome: 'Mais', icone: MoreHorizontal },
]

export function AppShell() {
  const { usuario, config, sair, ehAdmin } = useAuth()
  const local = useLocation()
  const papelNome = usuario?.papel === 'admin' ? 'Administrador' : usuario?.papel === 'gestor' ? 'Gestor' : 'Vendedor'

  return (
    <div className="min-h-dvh md:flex">
      <aside className="hidden md:flex md:w-[248px] md:shrink-0 md:flex-col md:sticky md:top-0 md:h-dvh border-r border-white/[0.06] bg-fundo-0/40 backdrop-blur-xl px-4 py-5">
        <div className="flex items-center gap-3 px-2">
          <Monograma tamanho={40} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-tight texto-prata leading-tight">{config.geral.nomeApp}</p>
            <p className="text-[11px] text-prata-3 truncate">Pedrini & Azevedo</p>
          </div>
        </div>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
          {itens.map((it) => (
            <NavLink
              key={it.para}
              to={it.para}
              end={it.fim}
              className={({ isActive }) =>
                cx(
                  'relative flex h-11 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors',
                  isActive ? 'text-platina' : 'text-prata-2 hover:text-platina hover:bg-white/[0.04]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-ativo"
                      className="absolute inset-0 rounded-sm bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_1px_rgba(255,255,255,0.05)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  <it.icone className={cx('relative h-[18px] w-[18px]', isActive && 'text-[#a9baff]')} />
                  <span className="relative">{it.nome}</span>
                </>
              )}
            </NavLink>
          ))}
          {ehAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cx('flex h-11 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors', isActive ? 'text-platina bg-white/[0.07]' : 'text-prata-2 hover:text-platina hover:bg-white/[0.04]')
              }
            >
              <Settings2 className="h-[18px] w-[18px]" />
              Administração
            </NavLink>
          )}
        </nav>
        <div className="mt-auto">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar nome={usuario?.nome ?? ''} fotoUrl={usuario?.fotoUrl} tamanho={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-platina">{usuario?.nome}</p>
              <p className="truncate text-[11px] text-prata-3">
                {papelNome} · {usuario?.faixa}
              </p>
            </div>
            <button onClick={() => void sair()} aria-label="Sair" className="h-9 w-9 rounded-[10px] text-prata-3 hover:text-platina hover:bg-white/[0.06] flex items-center justify-center cursor-pointer">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="px-3 pt-2 text-[11px] text-prata-4 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Assistente: {config.geral.nomeAssistente}
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-fundo-0/70 backdrop-blur-xl px-4">
          <div className="flex items-center gap-2.5">
            <Monograma tamanho={30} />
            <span className="text-[15px] font-semibold tracking-tight texto-prata">{config.geral.nomeApp}</span>
          </div>
          <NavLink to="/mais" aria-label="Perfil">
            <Avatar nome={usuario?.nome ?? ''} fotoUrl={usuario?.fotoUrl} tamanho={32} />
          </NavLink>
        </header>

        <main className="flex-1 px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pb-10 md:pt-8 max-w-[1400px] w-full mx-auto">
          <Outlet key={local.pathname.split('/')[1]} />
        </main>

        <nav aria-label="Navegação inferior" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-fundo-0/80 backdrop-blur-xl area-segura-inferior">
          <ul className="grid grid-cols-5">
            {itens.map((it) => (
              <li key={it.para}>
                <NavLink
                  to={it.para}
                  end={it.fim}
                  className={({ isActive }) =>
                    cx('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors', isActive ? 'text-platina' : 'text-prata-3')
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={cx('flex h-8 w-12 items-center justify-center rounded-full transition-colors', isActive && 'bg-white/[0.08]')}>
                        <it.icone className={cx('h-5 w-5', isActive && 'text-[#a9baff]')} />
                      </span>
                      {it.nome}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
