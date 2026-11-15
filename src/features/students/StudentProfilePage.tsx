import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CalendarDays, CircleDollarSign, Edit3, History, LoaderCircle, Phone, RotateCcw, UserRoundX } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '../../components/shared/EmptyState'
import { GraduationBadge } from '../../components/shared/GraduationBadge'
import { Modal } from '../../components/ui/Modal'
import { academyKeys, getStudent, listGraduationHistory, listGraduations, listStatusHistory, listStudentPayments, recordGraduation, setStudentStatus, updateGraduationHistory } from '../../services/academy'
import type { GraduationHistory, StudentStatus } from '../../types/domain'
import { formatCompetence, formatCurrency, formatDate, formatTrainingTime, todayInBrazil } from '../../utils/format'

const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-raised px-4 text-base focus:border-gold/60'

export function StudentProfilePage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const student = useQuery({ queryKey: academyKeys.student(id), queryFn: () => getStudent(id) })
  const graduationHistory = useQuery({ queryKey: [...academyKeys.student(id), 'graduations'], queryFn: () => listGraduationHistory(id) })
  const statusHistory = useQuery({ queryKey: [...academyKeys.student(id), 'statuses'], queryFn: () => listStatusHistory(id) })
  const studentPayments = useQuery({ queryKey: [...academyKeys.student(id), 'payments'], queryFn: () => listStudentPayments(id) })
  const graduations = useQuery({ queryKey: academyKeys.graduations, queryFn: listGraduations })
  const [graduationOpen, setGraduationOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editingHistory, setEditingHistory] = useState<GraduationHistory | null>(null)

  async function refreshStudent() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: academyKeys.student(id) }),
      queryClient.invalidateQueries({ queryKey: academyKeys.students }),
    ])
  }

  if (student.isLoading) return <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div>
  if (!student.data || student.isError) return <EmptyState icon={UserRoundX} title="Aluno não encontrado" description="O cadastro não existe ou não pôde ser carregado." action={<Link to="/alunos" className="rounded-xl bg-gold px-5 py-3 font-bold text-ink">Voltar para alunos</Link>} />

  const data = student.data
  return <section>
    <Link to="/alunos" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-copy"><ArrowLeft className="size-4" />Alunos</Link>
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex items-center gap-3"><h1 className="text-3xl font-bold tracking-tight">{data.full_name}</h1><span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.status === 'active' ? 'bg-success/15 text-emerald-300' : 'bg-white/8 text-muted'}`}>{data.status === 'active' ? 'Ativo' : 'Inativo'}</span></div><div className="mt-3"><GraduationBadge graduation={data.current_graduation} /></div></div>
      <div className="flex gap-2"><Link to={`/alunos/${id}/editar`} className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-surface px-4 text-sm font-semibold hover:bg-raised"><Edit3 className="size-4" />Editar</Link><button onClick={() => setStatusOpen(true)} className="flex h-11 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-ink"><RotateCcw className="size-4" />{data.status === 'active' ? 'Inativar' : 'Reativar'}</button></div>
    </div>

    <div className="mt-7 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
      <article className="gold-border rounded-3xl bg-surface p-5 sm:p-6"><h2 className="font-bold">Dados do aluno</h2><dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <Info icon={Phone} label="Telefone" value={data.phone ? <a href={`tel:${data.phone.replace(/\D/g, '')}`} className="text-gold-soft hover:underline">{data.phone}</a> : 'Não informado'} />
        <Info icon={CalendarDays} label="Nascimento" value={formatDate(data.birth_date)} />
        <Info icon={History} label="Início dos treinos" value={`${formatDate(data.training_start_date)} · ${formatTrainingTime(data.training_start_date)}`} />
        <Info icon={CircleDollarSign} label="Mensalidade" value={`${formatCurrency(Number(data.monthly_fee))} · vence dia ${data.due_day}`} />
        <Info icon={CalendarDays} label="Cadastro no sistema" value={formatDate(data.registration_date)} />
        <Info icon={CalendarDays} label="Início financeiro" value={formatDate(data.financial_start_month)} />
      </dl>{data.notes && <div className="mt-6 border-t border-white/8 pt-5"><p className="text-xs text-muted">Observações</p><p className="mt-2 whitespace-pre-line text-sm leading-6">{data.notes}</p></div>}</article>

      <article className="gold-border rounded-3xl bg-surface p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Graduações</h2><button onClick={() => setGraduationOpen(true)} className="rounded-lg bg-gold/10 px-3 py-2 text-xs font-bold text-gold-soft">Nova graduação</button></div><div className="mt-5 space-y-4">{graduationHistory.isLoading && <LoaderCircle className="size-5 animate-spin text-gold" />}{graduationHistory.data?.map((item, index) => <button key={item.id} onClick={() => setEditingHistory(item)} className="flex w-full items-start gap-3 text-left"><span className={`mt-1 size-3 shrink-0 rounded-full ${index === 0 ? 'bg-gold' : 'bg-zinc-600'}`} /><span className="min-w-0"><GraduationBadge graduation={item.graduation} compact /><span className="mt-1 block text-xs text-muted">{formatDate(item.graduated_at)}{item.notes ? ` · ${item.notes}` : ''}</span></span></button>)}{graduationHistory.data?.length === 0 && <p className="text-sm text-muted">Nenhum histórico registrado.</p>}</div></article>
    </div>

    <button onClick={() => setHistoryOpen(true)} className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-copy"><History className="size-4" />Ver histórico de situação</button>

    <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-lg font-bold">Mensalidades</h2><Link to="/financeiro" className="text-sm text-gold-soft hover:underline">Abrir financeiro</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{studentPayments.data?.slice(0, 6).map((payment) => <article key={payment.id} className="rounded-2xl border border-white/8 bg-surface p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold capitalize">{formatCompetence(payment.competence)}</p><span className={`rounded-full px-2 py-1 text-[11px] ${payment.display_status === 'paid' ? 'bg-success/15 text-emerald-300' : payment.display_status === 'overdue' ? 'bg-danger/15 text-red-300' : 'bg-white/7 text-muted'}`}>{payment.display_status === 'paid' ? 'Paga' : payment.display_status === 'overdue' ? 'Atrasada' : payment.display_status === 'cancelled' ? 'Cancelada' : 'Pendente'}</span></div><div className="mt-3 flex items-end justify-between"><span className="text-xs text-muted">Vence {formatDate(payment.due_date)}</span><strong className="text-sm text-gold-soft">{formatCurrency(Number(payment.amount))}</strong></div></article>)}{studentPayments.isSuccess && studentPayments.data.length === 0 && <p className="text-sm text-muted">Nenhuma mensalidade gerada.</p>}</div></section>

    <GraduationForm open={graduationOpen} onClose={() => setGraduationOpen(false)} studentId={id} graduations={graduations.data ?? []} onSaved={async () => { setGraduationOpen(false); await refreshStudent() }} />
    <GraduationForm open={Boolean(editingHistory)} onClose={() => setEditingHistory(null)} studentId={id} graduations={graduations.data ?? []} history={editingHistory ?? undefined} onSaved={async () => { setEditingHistory(null); await refreshStudent() }} />
    <StatusForm open={statusOpen} onClose={() => setStatusOpen(false)} studentId={id} nextStatus={data.status === 'active' ? 'inactive' : 'active'} onSaved={async () => { setStatusOpen(false); await refreshStudent() }} />
    <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Histórico de situação"><div className="space-y-4">{statusHistory.data?.map((item) => <div key={item.id} className="flex gap-3 border-b border-white/8 pb-4 last:border-0"><span className={`mt-1 size-3 rounded-full ${item.status === 'active' ? 'bg-success' : 'bg-zinc-500'}`} /><div><p className="text-sm font-semibold">{item.status === 'active' ? 'Aluno ativo' : 'Aluno inativo'}</p><p className="mt-1 text-xs text-muted">{formatDate(item.effective_date)}{item.notes ? ` · ${item.notes}` : ''}</p></div></div>)}</div></Modal>
  </section>
}

function Info({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: React.ReactNode }) {
  return <div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-gold" /><div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div></div>
}

function GraduationForm({ open, onClose, studentId, graduations, history, onSaved }: { open: boolean; onClose: () => void; studentId: string; graduations: Awaited<ReturnType<typeof listGraduations>>; history?: GraduationHistory; onSaved: () => Promise<void> }) {
  const [graduationId, setGraduationId] = useState(history?.graduation_id ?? '')
  const [date, setDate] = useState(history?.graduated_at ?? todayInBrazil())
  const [notes, setNotes] = useState(history?.notes ?? '')
  useEffect(() => {
    setGraduationId(history?.graduation_id ?? '')
    setDate(history?.graduated_at ?? todayInBrazil())
    setNotes(history?.notes ?? '')
  }, [history, open])
  const save = useMutation({ mutationFn: () => history ? updateGraduationHistory(history.id, graduationId, date, notes) : recordGraduation(studentId, graduationId, date, notes), onSuccess: async () => { toast.success(history ? 'Histórico corrigido.' : 'Graduação registrada.'); await onSaved() }, onError: () => toast.error('Não foi possível salvar a graduação.') })
  return <Modal open={open} onClose={onClose} title={history ? 'Corrigir graduação' : 'Registrar graduação'}><form onSubmit={(event) => { event.preventDefault(); if (graduationId && date) save.mutate() }}><label className="text-sm font-medium">Prajied<select value={graduationId} onChange={(event) => setGraduationId(event.target.value)} className={fieldClass} required><option value="">Selecione</option>{graduations.filter((item) => item.is_active || item.id === history?.graduation_id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="mt-4 block text-sm font-medium">Data da graduação<input value={date} onChange={(event) => setDate(event.target.value)} type="date" max={todayInBrazil()} className={fieldClass} required /></label><label className="mt-4 block text-sm font-medium">Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-raised p-4" /></label><button disabled={save.isPending} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink disabled:opacity-60">{save.isPending && <LoaderCircle className="size-5 animate-spin" />}Salvar</button></form></Modal>
}

function StatusForm({ open, onClose, studentId, nextStatus, onSaved }: { open: boolean; onClose: () => void; studentId: string; nextStatus: StudentStatus; onSaved: () => Promise<void> }) {
  const [date, setDate] = useState(todayInBrazil())
  const [notes, setNotes] = useState('')
  const title = nextStatus === 'inactive' ? 'Inativar aluno' : 'Reativar aluno'
  const description = useMemo(() => nextStatus === 'inactive' ? 'O histórico será preservado e novas mensalidades serão suspensas na próxima etapa.' : 'A geração de mensalidades será retomada a partir da reativação.', [nextStatus])
  const save = useMutation({ mutationFn: () => setStudentStatus(studentId, nextStatus, date, notes), onSuccess: async () => { toast.success(nextStatus === 'inactive' ? 'Aluno inativado.' : 'Aluno reativado.'); await onSaved() }, onError: () => toast.error('Não foi possível alterar a situação.') })
  return <Modal open={open} onClose={onClose} title={title}><form onSubmit={(event) => { event.preventDefault(); save.mutate() }}><p className="text-sm leading-6 text-muted">{description}</p><label className="mt-5 block text-sm font-medium">Data efetiva<input value={date} onChange={(event) => setDate(event.target.value)} type="date" max={todayInBrazil()} className={fieldClass} required /></label><label className="mt-4 block text-sm font-medium">Motivo / observação<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-raised p-4" /></label><button disabled={save.isPending} className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-gold font-bold text-ink disabled:opacity-60">Confirmar</button></form></Modal>
}
