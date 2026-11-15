import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { endOfMonth, endOfYear, format, parseISO, startOfMonth, startOfYear } from 'date-fns'
import { BarChart3, CircleDollarSign, LoaderCircle, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { academyKeys, listAllStatusHistory, listMonthlyPayments, listPaymentRecords, listStudents } from '../../services/academy'
import { formatCompetence, formatCurrency, formatDate, todayInBrazil } from '../../utils/format'

type ReportTab = 'financial' | 'students'
type PeriodMode = 'month' | 'year' | 'custom'

export function ReportsPage() {
  const now = parseISO(todayInBrazil())
  const [tab, setTab] = useState<ReportTab>('financial')
  const [mode, setMode] = useState<PeriodMode>('month')
  const [month, setMonth] = useState(format(now, 'yyyy-MM'))
  const [year, setYear] = useState(String(now.getFullYear()))
  const [customStart, setCustomStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(now), 'yyyy-MM-dd'))
  const payments = useQuery({ queryKey: [...academyKeys.payments, 'reports'], queryFn: () => listMonthlyPayments('all') })
  const records = useQuery({ queryKey: [...academyKeys.paymentRecords, 'reports'], queryFn: listPaymentRecords })
  const students = useQuery({ queryKey: [...academyKeys.students, 'reports'], queryFn: () => listStudents('', 'all') })
  const statuses = useQuery({ queryKey: ['status-history', 'reports'], queryFn: listAllStatusHistory })

  const period = useMemo(() => {
    if (mode === 'month') { const date = parseISO(`${month}-01`); return { start: format(startOfMonth(date), 'yyyy-MM-dd'), end: format(endOfMonth(date), 'yyyy-MM-dd') } }
    if (mode === 'year') { const date = new Date(Number(year), 0, 1); return { start: format(startOfYear(date), 'yyyy-MM-dd'), end: format(endOfYear(date), 'yyyy-MM-dd') } }
    return { start: customStart, end: customEnd }
  }, [mode, month, year, customStart, customEnd])

  const chargeRows = payments.data?.filter((item) => item.competence >= period.start.slice(0, 7) + '-01' && item.competence <= period.end.slice(0, 7) + '-01') ?? []
  const receiptRows = records.data?.filter((item) => !item.voided_at && item.paid_at >= period.start && item.paid_at <= period.end) ?? []
  const newStudents = students.data?.filter((item) => item.registration_date >= period.start && item.registration_date <= period.end) ?? []
  const statusRows = statuses.data?.filter((item) => item.effective_date >= period.start && item.effective_date <= period.end) ?? []
  const loading = payments.isLoading || records.isLoading || students.isLoading || statuses.isLoading

  return <section><PageHeader eyebrow="Análises" title="Relatórios" description="Competências e recebimentos são exibidos separadamente para manter a leitura financeira correta." />
    <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-white/8 bg-surface p-4 lg:flex-row lg:items-end"><label className="text-xs text-muted">Período<select value={mode} onChange={(event) => setMode(event.target.value as PeriodMode)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-raised px-3 text-sm text-copy lg:w-40"><option value="month">Mês</option><option value="year">Ano</option><option value="custom">Personalizado</option></select></label>{mode === 'month' && <label className="text-xs text-muted">Mês<input value={month} onChange={(event) => setMonth(event.target.value)} type="month" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-raised px-3 text-sm text-copy lg:w-44" /></label>}{mode === 'year' && <label className="text-xs text-muted">Ano<input value={year} onChange={(event) => setYear(event.target.value)} type="number" min="2020" max="2100" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-raised px-3 text-sm text-copy lg:w-32" /></label>}{mode === 'custom' && <><label className="text-xs text-muted">De<input value={customStart} onChange={(event) => setCustomStart(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-raised px-3 text-sm text-copy" /></label><label className="text-xs text-muted">Até<input value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} type="date" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-raised px-3 text-sm text-copy" /></label></>}</div>
    <div className="mt-5 grid grid-cols-2 rounded-xl bg-surface p-1 sm:w-80"><button onClick={() => setTab('financial')} className={`rounded-lg px-4 py-3 text-sm font-semibold ${tab === 'financial' ? 'bg-raised text-gold-soft' : 'text-muted'}`}>Financeiro</button><button onClick={() => setTab('students')} className={`rounded-lg px-4 py-3 text-sm font-semibold ${tab === 'students' ? 'bg-raised text-gold-soft' : 'text-muted'}`}>Alunos</button></div>
    {loading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div> : tab === 'financial' ? <FinancialReport charges={chargeRows} receipts={receiptRows} /> : <StudentsReport students={students.data ?? []} newStudents={newStudents} statuses={statusRows} />}
  </section>
}

function FinancialReport({ charges, receipts }: { charges: Awaited<ReturnType<typeof listMonthlyPayments>>; receipts: Awaited<ReturnType<typeof listPaymentRecords>> }) {
  const totalReceived = receipts.reduce((sum, item) => sum + Number(item.amount), 0)
  const totalOpen = charges.filter((item) => item.display_status === 'pending' || item.display_status === 'overdue').reduce((sum, item) => sum + Number(item.amount), 0)
  return <div className="mt-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Summary label="Recebido no período" value={formatCurrency(totalReceived)} /><Summary label="Em aberto por competência" value={formatCurrency(totalOpen)} /><Summary label="Pagas" value={String(charges.filter((item) => item.display_status === 'paid').length)} /><Summary label="Pendentes" value={String(charges.filter((item) => item.display_status === 'pending').length)} /><Summary label="Atrasadas" value={String(charges.filter((item) => item.display_status === 'overdue').length)} danger /></div><div className="mt-5 grid gap-4 xl:grid-cols-2"><ReportList icon={CircleDollarSign} title="Recebimentos por data efetiva" empty="Nenhum recebimento no período." rows={receipts.map((item) => ({ id: item.id, title: item.monthly_payment?.student?.full_name ?? '', detail: `${formatDate(item.paid_at)} · competência ${item.monthly_payment ? formatCompetence(item.monthly_payment.competence) : '—'}`, value: formatCurrency(Number(item.amount)) }))} /><ReportList icon={BarChart3} title="Mensalidades por competência" empty="Nenhuma competência no período." rows={charges.map((item) => ({ id: item.id, title: item.student?.full_name ?? '', detail: `${formatCompetence(item.competence)} · ${statusLabel(item.display_status)}`, value: formatCurrency(Number(item.amount)) }))} /></div></div>
}

function StudentsReport({ students, newStudents, statuses }: { students: Awaited<ReturnType<typeof listStudents>>; newStudents: Awaited<ReturnType<typeof listStudents>>; statuses: Awaited<ReturnType<typeof listAllStatusHistory>> }) {
  return <div className="mt-5"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Summary label="Alunos ativos" value={String(students.filter((item) => item.status === 'active').length)} /><Summary label="Alunos inativos" value={String(students.filter((item) => item.status === 'inactive').length)} /><Summary label="Novos cadastros" value={String(newStudents.length)} /><Summary label="Mudanças de situação" value={String(statuses.length)} /></div><div className="mt-5 grid gap-4 xl:grid-cols-2"><ReportList icon={Users} title="Novos alunos no período" empty="Nenhum novo aluno." rows={newStudents.map((item) => ({ id: item.id, title: item.full_name, detail: `Cadastrado em ${formatDate(item.registration_date)}` }))} /><ReportList icon={Users} title="Histórico de situação" empty="Nenhuma mudança no período." rows={statuses.map((item) => ({ id: item.id, title: item.student?.full_name ?? '', detail: `${item.status === 'active' ? 'Ativação' : 'Inativação'} em ${formatDate(item.effective_date)}` }))} /></div></div>
}

function Summary({ label, value, danger }: { label: string; value: string; danger?: boolean }) { return <article className="rounded-2xl border border-white/8 bg-surface p-4"><p className="text-xs text-muted">{label}</p><strong className={`mt-2 block text-lg ${danger ? 'text-red-300' : 'text-gold-soft'}`}>{value}</strong></article> }
interface Row { id: string; title: string; detail: string; value?: string }
function ReportList({ icon: Icon, title, empty, rows }: { icon: typeof Users; title: string; empty: string; rows: Row[] }) { return <article className="gold-border rounded-3xl bg-surface p-5"><div className="flex items-center gap-2"><Icon className="size-5 text-gold" /><h2 className="font-bold">{title}</h2></div><div className="mt-4 max-h-[30rem] space-y-1 overflow-y-auto">{rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-raised"><div><p className="text-sm font-medium">{row.title}</p><p className="mt-1 text-xs text-muted">{row.detail}</p></div>{row.value && <span className="shrink-0 text-sm font-semibold text-gold-soft">{row.value}</span>}</div>)}{rows.length === 0 && <p className="py-5 text-sm text-muted">{empty}</p>}</div></article> }
function statusLabel(status: string) { return status === 'paid' ? 'Paga' : status === 'overdue' ? 'Atrasada' : status === 'cancelled' ? 'Cancelada' : 'Pendente' }
