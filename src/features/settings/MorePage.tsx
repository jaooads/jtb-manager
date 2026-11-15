import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, ChevronRight, LoaderCircle, Medal, Settings, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { academyKeys, getAdminProfile, updateAdminDisplayName } from '../../services/academy'

export function MorePage() {
  const [profileOpen, setProfileOpen] = useState(false)
  return <section>
    <PageHeader eyebrow="Organização" title="Mais" description="Graduações, relatórios e configurações do sistema." />
    <div className="mt-7 grid gap-3 sm:grid-cols-2">
      <button onClick={() => setProfileOpen(true)} className="gold-border group flex items-center gap-4 rounded-2xl bg-surface p-5 text-left hover:bg-raised"><span className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><UserRound className="size-5" /></span><span className="flex-1"><strong className="block">Perfil administrativo</strong><small className="text-muted">Nome exibido após o login</small></span><ChevronRight className="size-5 text-muted group-hover:text-gold" /></button>
      <Link to="/prajieds" className="gold-border group flex items-center gap-4 rounded-2xl bg-surface p-5 hover:bg-raised"><span className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><Medal className="size-5" /></span><span className="flex-1"><strong className="block">Prajieds</strong><small className="text-muted">Cores, ordem e situação</small></span><ChevronRight className="size-5 text-muted group-hover:text-gold" /></Link>
      <Link to="/relatorios" className="gold-border group flex items-center gap-4 rounded-2xl bg-surface p-5 hover:bg-raised"><span className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><BarChart3 className="size-5" /></span><span className="flex-1"><strong className="block">Relatórios</strong><small className="text-muted">Financeiro e alunos por período</small></span><ChevronRight className="size-5 text-muted group-hover:text-gold" /></Link>
      <Link to="/financeiro" className="gold-border group flex items-center gap-4 rounded-2xl bg-surface p-5 hover:bg-raised"><span className="grid size-11 place-items-center rounded-xl bg-gold/10 text-gold"><Settings className="size-5" /></span><span className="flex-1"><strong className="block">Configurações financeiras</strong><small className="text-muted">Padrões para novos alunos</small></span><ChevronRight className="size-5 text-muted group-hover:text-gold" /></Link>
    </div>
    <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
  </section>
}

function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const profile = useQuery({ queryKey: academyKeys.adminProfile, queryFn: getAdminProfile, enabled: open })
  const [displayName, setDisplayName] = useState('')
  useEffect(() => { if (profile.data) setDisplayName(profile.data.display_name) }, [profile.data, open])
  const save = useMutation({
    mutationFn: () => updateAdminDisplayName(displayName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: academyKeys.adminProfile })
      toast.success('Nome de exibição atualizado.')
      onClose()
    },
    onError: () => toast.error('Não foi possível atualizar o perfil.'),
  })
  return <Modal open={open} onClose={onClose} title="Perfil administrativo">
    <form onSubmit={(event) => { event.preventDefault(); if (displayName.trim()) save.mutate() }}>
      <p className="text-sm leading-6 text-muted">Este nome aparece somente depois da autenticação. Ele não fica escrito no login público.</p>
      <label className="mt-5 block text-sm font-medium">Nome de exibição<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} autoComplete="off" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-raised px-4 text-base focus:border-gold/60" /></label>
      <button disabled={save.isPending || !displayName.trim()} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink disabled:opacity-50">{save.isPending && <LoaderCircle className="size-5 animate-spin" />}Salvar perfil</button>
    </form>
  </Modal>
}
