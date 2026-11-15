import { Navigate, Route, Routes } from 'react-router-dom'
import { LoaderCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { UpdatePasswordPage } from '../features/auth/UpdatePasswordPage'
import { AppShell } from '../components/layout/AppShell'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { StudentsPage } from '../features/students/StudentsPage'
import { StudentFormPage } from '../features/students/StudentFormPage'
import { StudentProfilePage } from '../features/students/StudentProfilePage'
import { GraduationsPage } from '../features/graduations/GraduationsPage'
import { MorePage } from '../features/settings/MorePage'
import { FinancialPage } from '../features/payments/FinancialPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ReportsPage } from '../features/reports/ReportsPage'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="grid min-h-dvh place-items-center bg-ink"><LoaderCircle className="size-8 animate-spin text-gold" aria-label="Carregando" /></div>
  return session ? children : <Navigate to="/login" replace />
}

function SetupRequired() {
  return <main className="app-bg grid min-h-dvh place-items-center px-5"><section className="gold-border max-w-lg rounded-3xl bg-surface p-7 text-center"><img src={`${import.meta.env.BASE_URL}branding/daniel-muay-thai.png`} alt="Daniel Muay Thai" className="mx-auto size-32 object-contain" /><ShieldCheck className="mx-auto mt-5 size-7 text-gold" /><h1 className="mt-3 text-xl font-bold">Conecte o Supabase</h1><p className="mt-2 text-sm leading-6 text-muted">Crie o arquivo <code className="rounded bg-raised px-1.5 py-1 text-gold-soft">.env.local</code> usando o modelo <code className="rounded bg-raised px-1.5 py-1 text-gold-soft">.env.example</code>. Nenhuma credencial foi incluída no código.</p></section></main>
}

export function App() {
  if (!isSupabaseConfigured) return <SetupRequired />
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/redefinir-senha" element={<UpdatePasswordPage />} />
    <Route path="/*" element={<Protected><AppShell><Routes>
      <Route index element={<DashboardPage />} />
      <Route path="alunos" element={<StudentsPage />} />
      <Route path="alunos/novo" element={<StudentFormPage />} />
      <Route path="alunos/:id" element={<StudentProfilePage />} />
      <Route path="alunos/:id/editar" element={<StudentFormPage />} />
      <Route path="prajieds" element={<GraduationsPage />} />
      <Route path="financeiro" element={<FinancialPage />} />
      <Route path="relatorios" element={<ReportsPage />} />
      <Route path="mais" element={<MorePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes></AppShell></Protected>} />
  </Routes>
}
