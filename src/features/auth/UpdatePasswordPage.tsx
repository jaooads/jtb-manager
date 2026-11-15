import { useState } from 'react'
import { LockKeyhole, LoaderCircle } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { supabase } from '../../lib/supabase/client'
import { useAuth } from './AuthProvider'

const passwordSchema = z.string().min(8, 'Use pelo menos 8 caracteres.')

export function UpdatePasswordPage() {
  const { session, passwordRecovery, finishPasswordRecovery } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  if (!session) return <Navigate to="/login" replace />
  if (!passwordRecovery) return <Navigate to="/" replace />

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = passwordSchema.safeParse(password)
    if (!result.success) { toast.error(result.error.issues[0]?.message); return }
    setLoading(true)
    const { error } = await supabase!.auth.updateUser({ password })
    setLoading(false)
    if (error) { toast.error('Não foi possível atualizar a senha.'); return }
    finishPasswordRecovery()
    toast.success('Senha atualizada com sucesso.')
    navigate('/', { replace: true })
  }

  return <main className="app-bg grid min-h-dvh place-items-center px-5"><form onSubmit={submit} className="gold-border w-full max-w-sm rounded-3xl bg-surface p-6"><LockKeyhole className="size-7 text-gold" /><h1 className="mt-4 text-2xl font-bold">Crie uma nova senha</h1><p className="mt-2 text-sm text-muted">Escolha uma senha segura para continuar.</p><label className="mt-6 block text-sm font-medium">Nova senha<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" className="mt-2 h-13 w-full rounded-xl border border-white/10 bg-raised px-4 text-base focus:border-gold/60" /></label><button disabled={loading} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink disabled:opacity-60">{loading && <LoaderCircle className="size-5 animate-spin" />}Salvar nova senha</button></form></main>
}
