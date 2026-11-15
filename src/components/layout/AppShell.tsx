import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { ChartNoAxesColumnIncreasing, CircleDollarSign, Dumbbell, Home, LogOut, Medal, Menu, Users } from 'lucide-react'
import { useAuth } from '../../features/auth/AuthProvider'
import { FinancialBootstrap } from '../../features/payments/FinancialBootstrap'

const nav = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/alunos', label: 'Alunos', icon: Users },
  { to: '/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { to: '/mais', label: 'Mais', icon: Menu },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  return (
    <div className="app-bg min-h-dvh">
      <FinancialBootstrap />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/8 bg-surface/95 p-5 backdrop-blur lg:flex lg:flex-col">
        <div className="mb-9 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}branding/daniel-muay-thai.png`} alt="" className="size-14 object-contain" />
          <div><strong className="block leading-tight">Daniel Muay Thai</strong><span className="text-xs text-muted">Gestão da academia</span></div>
        </div>
        <nav className="space-y-2">
          {nav.slice(0, 3).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${isActive ? 'bg-gold text-ink font-bold' : 'text-muted hover:bg-raised hover:text-copy'}`}><Icon className="size-5" />{label}</NavLink>)}
          <NavLink to="/prajieds" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${isActive ? 'bg-gold text-ink font-bold' : 'text-muted hover:bg-raised hover:text-copy'}`}><Medal className="size-5" />Prajieds</NavLink>
          <NavLink to="/relatorios" className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${isActive ? 'bg-gold text-ink font-bold' : 'text-muted hover:bg-raised hover:text-copy'}`}><ChartNoAxesColumnIncreasing className="size-5" />Relatórios</NavLink>
        </nav>
        <button onClick={signOut} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted hover:bg-raised hover:text-copy"><LogOut className="size-5" />Sair</button>
      </aside>

      <div className="lg:pl-64">
        <header className="safe-top sticky top-0 z-20 border-b border-white/8 bg-ink/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-17 items-center justify-between px-5">
            <div className="flex items-center gap-3"><img src={`${import.meta.env.BASE_URL}branding/daniel-muay-thai.png`} alt="" className="size-11 object-contain" /><div><strong className="block text-sm">Daniel Muay Thai</strong><span className="text-xs text-muted">Área administrativa</span></div></div>
            <Dumbbell className="size-5 text-gold" />
          </div>
        </header>
        <main className="mx-auto min-h-dvh max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:px-9 lg:pb-10 lg:pt-9">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-white/10 bg-surface/95 px-2 pt-2 backdrop-blur-xl lg:hidden">
        {nav.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium transition ${isActive ? 'text-gold-soft' : 'text-muted'}`}><Icon className="size-5" />{label}</NavLink>)}
      </nav>
    </div>
  )
}
