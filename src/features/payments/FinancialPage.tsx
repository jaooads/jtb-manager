import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, CalendarPlus, Check, CircleDollarSign, History, LoaderCircle, Search, Settings, Undo2, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '../../components/shared/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { academyKeys, getSystemSettings, listMonthlyPayments, listPaymentRecords, listStudents, payStudentCompetencies, registerPayments, setMonthlyPaymentCancelled, updateSystemSettings, voidPayment } from '../../services/academy'
import type { MonthlyPayment, PaymentDisplayStatus, PaymentMethod } from '../../types/domain'
import { formatCompetence, formatCurrency, formatDate, todayInBrazil } from '../../utils/format'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

type Filter = 'all' | PaymentDisplayStatus
const fieldClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-raised px-4 text-base focus:border-gold/60'
const methods: Array<[PaymentMethod, string]> = [['pix', 'Pix'], ['cash', 'Dinheiro'], ['card', 'Cartão'], ['transfer', 'Transferência']]
const statusMeta: Record<PaymentDisplayStatus, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-amber-400/10 text-amber-300' },
  overdue: { label: 'Atrasada', className: 'bg-danger/15 text-red-300' },
  paid: { label: 'Paga', className: 'bg-success/15 text-emerald-300' },
  cancelled: { label: 'Cancelada', className: 'bg-white/7 text-muted' },
}

export function FinancialPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [paying, setPaying] = useState<MonthlyPayment | null>(null)
  const [correcting, setCorrecting] = useState<MonthlyPayment | null>(null)
  const [cancelling, setCancelling] = useState<MonthlyPayment | null>(null)
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const online = useOnlineStatus()
  const payments = useQuery({ queryKey: [...academyKeys.payments, filter], queryFn: () => listMonthlyPayments(filter) })
  const records = useQuery({ queryKey: academyKeys.paymentRecords, queryFn: listPaymentRecords })
  const filtered = useMemo(() => payments.data?.filter((item) => item.student?.full_name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) ?? [], [payments.data, search])

  useEffect(() => {
    if (online) return
    setPaying(null)
    setCorrecting(null)
    setCancelling(null)
    setAdvanceOpen(false)
    setSettingsOpen(false)
  }, [online])

  async function refresh() {
    await Promise.all([queryClient.invalidateQueries({ queryKey: academyKeys.payments }), queryClient.invalidateQueries({ queryKey: academyKeys.paymentRecords })])
  }

  return <section>
    <PageHeader eyebrow="Controle financeiro" title="Mensalidades" description="Acompanhe cobranças, confirme recebimentos e registre pagamentos antecipados." action={<div className="flex gap-2"><button disabled={!online} onClick={() => setSettingsOpen(true)} aria-label="Configurações financeiras" className="grid size-12 place-items-center rounded-xl border border-white/10 bg-surface text-muted hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"><Settings className="size-5" /></button><button disabled={!online} onClick={() => setAdvanceOpen(true)} className="flex h-12 items-center gap-2 rounded-xl bg-gold px-4 font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40"><CalendarPlus className="size-5" /><span className="hidden sm:inline">Antecipar pagamento</span><span className="sm:hidden">Antecipar</span></button></div>} />
    {!online && <div className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-sm text-amber-200">Operações financeiras ficam bloqueadas enquanto o aparelho estiver offline.</div>}

    <div className="mt-7 flex flex-col gap-3 lg:flex-row">
      <label className="relative flex-1"><span className="sr-only">Pesquisar aluno</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-surface pl-12 pr-4 placeholder:text-zinc-600 focus:border-gold/60" placeholder="Pesquisar aluno" /></label>
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1">{([['all', 'Todas'], ['overdue', 'Atrasadas'], ['pending', 'Pendentes'], ['paid', 'Pagas'], ['cancelled', 'Canceladas']] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium ${filter === value ? 'bg-raised text-gold-soft shadow' : 'text-muted'}`}>{label}</button>)}</div>
    </div>

    <div className="mt-5">{payments.isLoading && <div className="grid min-h-52 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div>}{payments.isError && <EmptyState icon={CircleDollarSign} title="Financeiro indisponível" description="Aplique a migration da Etapa 3 no Supabase e tente novamente." />}{payments.isSuccess && filtered.length === 0 && <EmptyState icon={WalletCards} title="Nenhuma mensalidade encontrada" description="As mensalidades são geradas automaticamente para os alunos ativos." />}{filtered.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{filtered.map((payment) => <PaymentCard key={payment.id} payment={payment} disabled={!online} onPay={() => setPaying(payment)} onCorrect={() => setCorrecting(payment)} onCancel={() => setCancelling(payment)} />)}</div>}</div>

    <section className="mt-10"><div className="flex items-center gap-2"><History className="size-5 text-gold" /><h2 className="text-lg font-bold">Histórico de recebimentos</h2></div><div className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-surface">{records.data?.slice(0, 8).map((record) => <div key={record.id} className="flex items-center justify-between gap-4 border-b border-white/8 px-4 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-medium">{record.monthly_payment?.student?.full_name}</p><p className="mt-1 text-xs text-muted">{formatCompetence(record.monthly_payment?.competence ?? '')} · {formatDate(record.paid_at)} · {methodLabel(record.payment_method)}</p></div><div className="text-right"><p className={`text-sm font-semibold ${record.voided_at ? 'text-muted line-through' : 'text-success'}`}>{formatCurrency(Number(record.amount))}</p>{record.voided_at && <span className="text-[11px] text-red-300">Corrigido</span>}</div></div>)}{records.data?.length === 0 && <p className="p-5 text-sm text-muted">Nenhum recebimento registrado.</p>}</div></section>

    <PaymentModal payment={paying} onClose={() => setPaying(null)} onSaved={async () => { setPaying(null); await refresh() }} />
    <CorrectionModal payment={correcting} onClose={() => setCorrecting(null)} onSaved={async () => { setCorrecting(null); await refresh() }} />
    <CancellationModal payment={cancelling} onClose={() => setCancelling(null)} onSaved={async () => { setCancelling(null); await refresh() }} />
    <AdvancePaymentModal open={advanceOpen} onClose={() => setAdvanceOpen(false)} onSaved={async () => { setAdvanceOpen(false); await refresh() }} />
    <FinancialSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
  </section>
}

function PaymentCard({ payment, disabled, onPay, onCorrect, onCancel }: { payment: MonthlyPayment; disabled: boolean; onPay: () => void; onCorrect: () => void; onCancel: () => void }) {
  const meta = statusMeta[payment.display_status]
  return <article className="gold-border rounded-2xl bg-surface p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-bold">{payment.student?.full_name}</h2><p className="mt-1 text-sm capitalize text-muted">{formatCompetence(payment.competence)}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span></div><div className="mt-5 flex items-end justify-between border-t border-white/8 pt-4"><div><p className="text-xs text-muted">Vencimento</p><p className="mt-1 text-sm font-medium">{formatDate(payment.due_date)}</p></div><strong className="text-xl text-gold-soft">{formatCurrency(Number(payment.amount))}</strong></div>{payment.paid_at && <p className="mt-3 text-xs text-muted">Recebido em {formatDate(payment.paid_at)} via {methodLabel(payment.payment_method)}</p>}{payment.cancellation_reason && <p className="mt-3 text-xs text-muted">Motivo: {payment.cancellation_reason}</p>}<div className="mt-4 flex gap-2">{(payment.display_status === 'pending' || payment.display_status === 'overdue') && <><button disabled={disabled} onClick={onPay} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-success font-bold text-white disabled:opacity-40"><Check className="size-4" />Confirmar</button><button disabled={disabled} onClick={onCancel} className="h-10 rounded-lg border border-white/10 px-3 text-xs text-muted hover:text-red-300 disabled:opacity-40">Cancelar</button></>}{payment.display_status === 'paid' && <button disabled={disabled} onClick={onCorrect} className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-xs text-muted hover:text-copy disabled:opacity-40"><Undo2 className="size-4" />Corrigir pagamento</button>}{payment.display_status === 'cancelled' && <button disabled={disabled} onClick={onCancel} className="flex h-10 items-center gap-2 rounded-lg border border-white/10 px-4 text-xs text-muted hover:text-copy disabled:opacity-40"><Undo2 className="size-4" />Reabrir mensalidade</button>}</div></article>
}

function PaymentModal({ payment, onClose, onSaved }: { payment: MonthlyPayment | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [paidAt, setPaidAt] = useState(todayInBrazil())
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const save = useMutation({ mutationFn: () => registerPayments([payment!.id], paidAt, method), onSuccess: async () => { toast.success('Pagamento confirmado.'); await onSaved() }, onError: () => toast.error('Não foi possível confirmar o pagamento.') })
  return <Modal open={Boolean(payment)} onClose={onClose} title="Confirmar pagamento"><form onSubmit={(event) => { event.preventDefault(); save.mutate() }}>{payment && <div className="rounded-xl bg-raised p-4"><p className="text-sm font-semibold">{payment.student?.full_name}</p><div className="mt-2 flex justify-between text-sm text-muted"><span className="capitalize">{formatCompetence(payment.competence)}</span><strong className="text-gold-soft">{formatCurrency(Number(payment.amount))}</strong></div></div>}<PaymentFields paidAt={paidAt} setPaidAt={setPaidAt} method={method} setMethod={setMethod} /><button disabled={save.isPending} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success font-bold text-white disabled:opacity-60">{save.isPending && <LoaderCircle className="size-5 animate-spin" />}Confirmar recebimento</button></form></Modal>
}

function PaymentFields({ paidAt, setPaidAt, method, setMethod }: { paidAt: string; setPaidAt: (value: string) => void; method: PaymentMethod; setMethod: (value: PaymentMethod) => void }) {
  return <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Data do pagamento<input value={paidAt} onChange={(event) => setPaidAt(event.target.value)} type="date" max={todayInBrazil()} className={fieldClass} required /></label><label className="text-sm font-medium">Forma de pagamento<select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} className={fieldClass}>{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
}

function CorrectionModal({ payment, onClose, onSaved }: { payment: MonthlyPayment | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [reason, setReason] = useState('')
  const save = useMutation({ mutationFn: () => voidPayment(payment!.active_payment_record_id!, reason), onSuccess: async () => { toast.success('Pagamento corrigido e mensalidade reaberta.'); setReason(''); await onSaved() }, onError: () => toast.error('Não foi possível corrigir o pagamento.') })
  return <Modal open={Boolean(payment)} onClose={onClose} title="Corrigir pagamento"><form onSubmit={(event) => { event.preventDefault(); if (reason.trim()) save.mutate() }}><p className="text-sm leading-6 text-muted">O registro não será apagado. Ele ficará marcado como corrigido para manter a rastreabilidade.</p><label className="mt-4 block text-sm font-medium">Motivo da correção<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required className="mt-2 w-full rounded-xl border border-white/10 bg-raised p-4" /></label><button disabled={save.isPending} className="mt-5 h-12 w-full rounded-xl bg-gold font-bold text-ink disabled:opacity-60">Confirmar correção</button></form></Modal>
}

function CancellationModal({ payment, onClose, onSaved }: { payment: MonthlyPayment | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const reopening = payment?.display_status === 'cancelled'
  const [reason, setReason] = useState('')
  const save = useMutation({ mutationFn: () => setMonthlyPaymentCancelled(payment!.id, !reopening, reason), onSuccess: async () => { toast.success(reopening ? 'Mensalidade reaberta.' : 'Mensalidade cancelada.'); setReason(''); await onSaved() }, onError: () => toast.error('Não foi possível alterar a mensalidade.') })
  return <Modal open={Boolean(payment)} onClose={onClose} title={reopening ? 'Reabrir mensalidade' : 'Cancelar mensalidade'}><form onSubmit={(event) => { event.preventDefault(); if (reopening || reason.trim()) save.mutate() }}><p className="text-sm text-muted">{reopening ? 'A cobrança voltará para a situação pendente.' : 'O cancelamento é administrativo e ficará registrado na mensalidade.'}</p>{!reopening && <label className="mt-4 block text-sm font-medium">Motivo<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} required className="mt-2 w-full rounded-xl border border-white/10 bg-raised p-4" /></label>}<button disabled={save.isPending} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink disabled:opacity-60">{reopening ? <Undo2 className="size-4" /> : <Ban className="size-4" />}{reopening ? 'Reabrir' : 'Cancelar mensalidade'}</button></form></Modal>
}

function AdvancePaymentModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const students = useQuery({ queryKey: [...academyKeys.students, 'advance'], queryFn: () => listStudents('', 'active'), enabled: open })
  const existingPayments = useQuery({ queryKey: [...academyKeys.payments, 'advance'], queryFn: () => listMonthlyPayments('all'), enabled: open })
  const [studentId, setStudentId] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [paidAt, setPaidAt] = useState(todayInBrazil())
  const [method, setMethod] = useState<PaymentMethod>('pix')
  const months = useMemo(() => Array.from({ length: 6 }, (_, index) => format(addMonths(startOfMonth(parseISO(todayInBrazil())), index), 'yyyy-MM-01')), [])
  const currentStudent = students.data?.find((student) => student.id === studentId)
  const total = selected.reduce((sum, competence) => {
    const existing = existingPayments.data?.find((item) => item.student_id === studentId && item.competence === competence)
    return sum + Number(existing?.amount ?? currentStudent?.monthly_fee ?? 0)
  }, 0)
  const save = useMutation({ mutationFn: () => payStudentCompetencies(studentId, selected, paidAt, method), onSuccess: async () => { toast.success('Pagamentos antecipados confirmados.'); setStudentId(''); setSelected([]); await onSaved() }, onError: () => toast.error('Não foi possível registrar. Confira se alguma competência já está paga.') })
  function toggle(value: string) { setSelected((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]) }
  return <Modal open={open} onClose={onClose} title="Pagamento antecipado"><form onSubmit={(event) => { event.preventDefault(); if (studentId && selected.length) save.mutate() }}><label className="text-sm font-medium">Aluno<select value={studentId} onChange={(event) => { setStudentId(event.target.value); setSelected([]) }} className={fieldClass} required><option value="">Selecione</option>{students.data?.map((student) => <option key={student.id} value={student.id}>{student.full_name}</option>)}</select></label>{studentId && <fieldset className="mt-5"><legend className="text-sm font-medium">Competências</legend><div className="mt-2 grid grid-cols-2 gap-2">{months.map((month) => { const existing = existingPayments.data?.find((item) => item.student_id === studentId && item.competence === month); const unavailable = existing?.display_status === 'paid' || existing?.display_status === 'cancelled'; return <label key={month} className={`flex items-center gap-2 rounded-xl border p-3 text-sm capitalize ${unavailable ? 'cursor-not-allowed border-white/5 bg-ink text-zinc-600' : selected.includes(month) ? 'cursor-pointer border-gold bg-gold/10 text-gold-soft' : 'cursor-pointer border-white/10 bg-raised text-muted'}`}><input type="checkbox" checked={selected.includes(month)} disabled={unavailable} onChange={() => toggle(month)} className="accent-gold" />{formatCompetence(month)}{existing?.display_status === 'paid' && <Check className="ml-auto size-3" />}</label> })}</div></fieldset>}<PaymentFields paidAt={paidAt} setPaidAt={setPaidAt} method={method} setMethod={setMethod} /><div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4"><span className="text-sm text-muted">Total previsto</span><strong className="text-xl text-gold-soft">{formatCurrency(total)}</strong></div><button disabled={save.isPending || !studentId || selected.length === 0} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-success font-bold text-white disabled:opacity-50">{save.isPending && <LoaderCircle className="size-5 animate-spin" />}Confirmar {selected.length || ''} pagamento{selected.length === 1 ? '' : 's'}</button></form></Modal>
}

function FinancialSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const settings = useQuery({ queryKey: academyKeys.settings, queryFn: getSystemSettings, enabled: open })
  const [fee, setFee] = useState(0)
  const [dueDay, setDueDay] = useState(10)
  useEffect(() => { if (settings.data) { setFee(Number(settings.data.default_monthly_fee)); setDueDay(settings.data.default_due_day) } }, [settings.data, open])
  const save = useMutation({ mutationFn: () => updateSystemSettings(fee, dueDay), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: academyKeys.settings }); toast.success('Padrões financeiros atualizados.'); onClose() }, onError: () => toast.error('Não foi possível salvar as configurações.') })
  return <Modal open={open} onClose={onClose} title="Padrões financeiros"><form onSubmit={(event) => { event.preventDefault(); save.mutate() }}><p className="text-sm leading-6 text-muted">Esses valores preenchem novos alunos. Cada cadastro pode ter sua própria exceção.</p><label className="mt-5 block text-sm font-medium">Mensalidade padrão<input value={fee} onChange={(event) => setFee(Number(event.target.value))} type="number" min="0" step="0.01" className={fieldClass} /></label><label className="mt-4 block text-sm font-medium">Dia de vencimento padrão<input value={dueDay} onChange={(event) => setDueDay(Number(event.target.value))} type="number" min="1" max="31" className={fieldClass} /></label><button disabled={save.isPending} className="mt-5 h-12 w-full rounded-xl bg-gold font-bold text-ink disabled:opacity-60">Salvar configurações</button></form></Modal>
}

function methodLabel(method?: PaymentMethod | null) {
  return methods.find(([value]) => value === method)?.[1] ?? '—'
}
