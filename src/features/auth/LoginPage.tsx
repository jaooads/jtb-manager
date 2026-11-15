import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { loginSchema, type LoginInput } from './authSchema'
import { useAuth } from './AuthProvider'
import { supabase } from '../../lib/supabase/client'

export function LoginPage() {
  const { session } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (session) return <Navigate to="/" replace />

  async function onSubmit(values: LoginInput) {
    if (!supabase) return
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : 'Não foi possível entrar. Tente novamente.')
      return
    }
    const { data: authorized } = await supabase.rpc('is_authorized_admin')
    if (!authorized) {
      await supabase.auth.signOut()
      toast.error('Este usuário não está autorizado a acessar o sistema.')
    }
  }

  async function sendRecovery() {
    const email = getValues('email')
    if (!email) { toast.info('Digite seu e-mail primeiro.'); return }
    if (!supabase) return
    setRecovery(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.href.split('#')[0]}#/redefinir-senha` })
    setRecovery(false)
    error ? toast.error('Não foi possível enviar o link.') : toast.success('Link de recuperação enviado para seu e-mail.')
  }

  return (
    <main className="app-bg safe-top flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] animate-[fade-in_.55s_ease-out]">
        <div className="mb-7 text-center">
          <img src={`${import.meta.env.BASE_URL}branding/daniel-muay-thai.png`} alt="Daniel Muay Thai" className="logo-glow mx-auto h-40 w-40 object-contain sm:h-48 sm:w-48" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.35em] text-gold-soft">Gestão da academia</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Bem-vinda, Dani</h1>
          <p className="mt-2 text-sm text-muted">Entre para cuidar da sua academia.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="gold-border rounded-3xl bg-surface/90 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
          <label className="mb-5 block text-sm font-medium">E-mail
            <span className="relative mt-2 block">
              <Mail aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input {...register('email')} type="email" inputMode="email" autoComplete="email" placeholder="dani@academia.com" className="h-13 w-full rounded-xl border border-white/10 bg-raised pl-12 pr-4 text-base placeholder:text-zinc-600 focus:border-gold/60" />
            </span>
            {errors.email && <span className="mt-1 block text-xs text-red-400">{errors.email.message}</span>}
          </label>
          <label className="block text-sm font-medium">Senha
            <span className="relative mt-2 block">
              <LockKeyhole aria-hidden className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
              <input {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Sua senha" className="h-13 w-full rounded-xl border border-white/10 bg-raised pl-12 pr-12 text-base placeholder:text-zinc-600 focus:border-gold/60" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-muted" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
            </span>
            {errors.password && <span className="mt-1 block text-xs text-red-400">{errors.password.message}</span>}
          </label>
          <button type="submit" disabled={isSubmitting} className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink transition hover:bg-gold-soft active:scale-[.99] disabled:opacity-60">{isSubmitting && <LoaderCircle className="size-5 animate-spin" />} Entrar</button>
          <button type="button" onClick={sendRecovery} disabled={recovery} className="mt-4 w-full py-2 text-sm text-gold-soft hover:text-gold">Esqueci minha senha</button>
        </form>
      </div>
    </main>
  )
}
