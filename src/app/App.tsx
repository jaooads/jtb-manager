import { Navigate, Route, Routes } from 'react-router-dom'
import { LoaderCircle, ShieldCheck, WifiOff } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { UpdatePasswordPage } from '../features/auth/UpdatePasswordPage'
import { AppShell } from '../components/layout/AppShell'
import { isSupabaseConfigured } from '../lib/supabase/client'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid min-h-dvh place-items-center bg-ink"><LoaderCircle className="size-8 animate-spin text-gold" aria-label="Carregando" /></div>
  return session ? children : <Navigate to="/login" replace />
}

function SetupRequired() {
  return <main className="app-bg grid min-h-dvh place-items-center px-5"><section className="gold-border max-w-lg rounded-3xl bg-surface p-7 text-center"><img src={`${import.meta.env.BASE_URL}branding/daniel-muay-thai.png`} alt="Daniel Muay Thai" className="mx-auto size-32 object-contain" /><ShieldCheck className="mx-auto mt-5 size-7 text-gold" /><h1 className="mt-3 text-xl font-bold">Conecte o Supabase</h1><p className="mt-2 text-sm leading-6 text-muted">Crie o arquivo <code className="rounded bg-raised px-1.5 py-1 text-gold-soft">.env.local</code> usando o modelo <code className="rounded bg-raised px-1.5 py-1 text-gold-soft">.env.example</code>. Nenhuma credencial foi incluída no código.</p></section></main>
}

function Dashboard() {
  return <div><p className="text-sm font-semibold uppercase tracking-[.25em] text-gold">Visão geral</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Olá, Dani!</h1><p className="mt-2 max-w-xl text-muted">A fundação segura da academia está pronta. Os indicadores financeiros aparecerão aqui quando o módulo financeiro for ativado.</p><section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><article className="gold-border rounded-2xl bg-surface p-5"><ShieldCheck className="size-6 text-success" /><h2 className="mt-4 font-semibold">Acesso protegido</h2><p className="mt-1 text-sm text-muted">Sessão autenticada e protegida pelo Supabase.</p></article><article className="gold-border rounded-2xl bg-surface p-5"><WifiOff className="size-6 text-gold" /><h2 className="mt-4 font-semibold">Aplicativo instalável</h2><p className="mt-1 text-sm text-muted">A interface abre offline; operações de dados exigem conexão.</p></article></section></div>
}

function ComingSoon({ title }: { title: string }) { return <section><p className="text-sm font-semibold uppercase tracking-[.25em] text-gold">Módulo</p><h1 className="mt-2 text-3xl font-bold">{title}</h1><div className="gold-border mt-7 rounded-2xl bg-surface p-6 text-sm text-muted">Este módulo será implementado na próxima etapa, conectado aos dados reais do Supabase.</div></section> }

export function App() {
  if (!isSupabaseConfigured) return <SetupRequired />
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/redefinir-senha" element={<UpdatePasswordPage />} />
    <Route path="/*" element={<Protected><AppShell><Routes><Route index element={<Dashboard />} /><Route path="alunos" element={<ComingSoon title="Alunos" />} /><Route path="financeiro" element={<ComingSoon title="Financeiro" />} /><Route path="mais" element={<ComingSoon title="Mais" />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell></Protected>} />
  </Routes>
}
