import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addDays, addMonths, format, isBefore, parseISO, startOfDay, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Cake, CalendarClock, CircleDollarSign, LoaderCircle, TrendingUp, UserCheck, UserMinus, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { academyKeys, listMonthlyPayments, listPaymentRecords, listStudents } from '../../services/academy'
import { formatCompetence, formatCurrency, formatDate } from '../../utils/format'
import { getUpcomingBirthdays } from './dashboardUtils'

export function DashboardPage() {
  const [chartMonths, setChartMonths] = useState(6)
  const students = useQuery({ queryKey: [...academyKeys.students, 'dashboard'], queryFn: () => listStudents('', 'all') })
  const payments = useQuery({ queryKey: [...academyKeys.payments, 'dashboard'], queryFn: () => listMonthlyPayments('all') })
  const records = useQuery({ queryKey: [...academyKeys.paymentRecords, 'dashboard'], queryFn: listPaymentRecords })
  const loading = students.isLoading || payments.isLoading || records.isLoading
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-01')

  const metrics = useMemo(() => {
    const currentPayments = payments.data?.filter((item) => item.competence === currentMonth) ?? []
    const currentRecords = records.data?.filter((item) => !item.voided_at && item.paid_at.slice(0, 7) === currentMonth.slice(0, 7)) ?? []
    const open = payments.data?.filter((item) => item.display_status === 'pending' || item.display_status === 'overdue') ?? []
    return {
      active: students.data?.filter((item) => item.status === 'active').length ?? 0,
      inactive: students.data?.filter((item) => item.status === 'inactive').length ?? 0,
      paid: currentPayments.filter((item) => item.display_status === 'paid').length,
      pending: currentPayments.filter((item) => item.display_status === 'pending').length,
      overdue: payments.data?.filter((item) => item.display_status === 'overdue').length ?? 0,
      received: currentRecords.reduce((sum, item) => sum + Number(item.amount), 0),
      openAmount: open.reduce((sum, item) => sum + Number(item.amount), 0),
    }
  }, [students.data, payments.data, records.data, currentMonth])

  const chartData = useMemo(() => Array.from({ length: chartMonths }, (_, index) => {
    const month = addMonths(startOfMonth(new Date()), index - chartMonths + 1)
    const key = format(month, 'yyyy-MM')
    return { label: format(month, 'MMM', { locale: ptBR }).replace('.', ''), value: records.data?.filter((item) => !item.voided_at && item.paid_at.startsWith(key)).reduce((sum, item) => sum + Number(item.amount), 0) ?? 0 }
  }), [records.data, chartMonths])

  const overdue = payments.data?.filter((item) => item.display_status === 'overdue').sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5) ?? []
  const today = startOfDay(new Date())
  const inThirtyDays = addDays(today, 30)
  const upcoming = payments.data?.filter((item) => item.display_status === 'pending' && !isBefore(parseISO(item.due_date), today) && isBefore(parseISO(item.due_date), inThirtyDays)).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 5) ?? []
  const recentStudents = [...(students.data ?? [])].sort((a, b) => b.registration_date.localeCompare(a.registration_date)).slice(0, 5)
  const birthdays = getUpcomingBirthdays(students.data ?? [], 7)

  return <section>
    <div className="relative min-h-56 overflow-hidden rounded-3xl border border-gold/10 bg-surface/35 p-5 sm:p-7"><img src={`${import.meta.env.BASE_URL}branding/daniel-muay-thai.png`} alt="" aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 w-64 max-h-[92%] -translate-x-1/2 select-none object-contain opacity-[0.05] grayscale sm:left-auto sm:right-6 sm:w-80 sm:translate-x-0" /><div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[.25em] text-gold">Visão geral</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Bem-vindo!</h1></div></div>
    {loading ? <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div> : <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7"><Metric icon={UserCheck} label="Alunos ativos" value={String(metrics.active)} /><Metric icon={UserMinus} label="Inativos" value={String(metrics.inactive)} /><Metric icon={WalletCards} label="Pagas no mês" value={String(metrics.paid)} /><Metric icon={CalendarClock} label="Pendentes" value={String(metrics.pending)} /><Metric icon={CircleDollarSign} label="Atrasadas" value={String(metrics.overdue)} danger={metrics.overdue > 0} /><Metric icon={TrendingUp} label="Recebido" value={formatCurrency(metrics.received)} /><Metric icon={CircleDollarSign} label="Em aberto" value={formatCurrency(metrics.openAmount)} /></div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_.65fr]"><article className="gold-border rounded-3xl bg-surface p-5"><div className="flex items-center justify-between"><div><h2 className="font-bold">Recebimentos mensais</h2><p className="mt-1 text-xs text-muted">Pela data efetiva do pagamento</p></div><select value={chartMonths} onChange={(event) => setChartMonths(Number(event.target.value))} className="rounded-lg border border-white/10 bg-raised px-3 py-2 text-xs"><option value={6}>6 meses</option><option value={12}>12 meses</option></select></div><div className="mt-5 h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D4AF37" stopOpacity={0.4} /><stop offset="100%" stopColor="#D4AF37" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#ffffff0b" vertical={false} /><XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={{ background: '#262626', border: '1px solid #ffffff18', borderRadius: 12 }} formatter={(value) => formatCurrency(Number(value))} /><Area type="monotone" dataKey="value" stroke="#D4AF37" strokeWidth={2} fill="url(#goldArea)" /></AreaChart></ResponsiveContainer></div></article><DashboardList title="Mensalidades atrasadas" empty="Nenhuma mensalidade atrasada." items={overdue.map((item) => ({ id: item.id, title: item.student?.full_name ?? '', detail: `${formatCompetence(item.competence)} · venceu ${formatDate(item.due_date)}`, value: formatCurrency(Number(item.amount)), danger: true }))} /></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3"><DashboardList title="Próximos vencimentos" empty="Nenhum vencimento próximo." items={upcoming.map((item) => ({ id: item.id, title: item.student?.full_name ?? '', detail: formatDate(item.due_date), value: formatCurrency(Number(item.amount)) }))} /><DashboardList title="Últimos pagamentos" empty="Nenhum pagamento registrado." items={(records.data ?? []).filter((item) => !item.voided_at).slice(0, 5).map((item) => ({ id: item.id, title: item.monthly_payment?.student?.full_name ?? '', detail: formatDate(item.paid_at), value: formatCurrency(Number(item.amount)) }))} /><DashboardList title="Alunos recentes" empty="Nenhum aluno cadastrado." items={recentStudents.map((item) => ({ id: item.id, title: item.full_name, detail: `Cadastro em ${formatDate(item.registration_date)}`, href: `/alunos/${item.id}` }))} /></div>
      <article className="gold-border mt-4 rounded-3xl bg-surface p-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-gold/10 text-gold"><Cake className="size-5" /></span><div><h2 className="font-bold">Aniversários próximos</h2><p className="text-xs text-muted">Hoje e nos próximos 7 dias</p></div></div>{birthdays.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{birthdays.map((item) => <Link key={item.student.id} to={`/alunos/${item.student.id}`} className="rounded-xl bg-raised p-3 hover:bg-white/8"><p className="text-sm font-semibold">{item.student.full_name}</p><p className="mt-1 text-xs text-gold-soft">{item.daysUntil === 0 ? 'Aniversário hoje' : `Dia ${item.date.getDate()} · em ${item.daysUntil} dias`}</p></Link>)}</div> : <p className="mt-4 text-sm text-muted">Nenhum aniversário nos próximos dias.</p>}</article>
    </>}
  </section>
}

function Metric({ icon: Icon, label, value, danger }: { icon: typeof UserCheck; label: string; value: string; danger?: boolean }) {
  return <article className="rounded-2xl border border-white/8 bg-surface p-4"><Icon className={`size-5 ${danger ? 'text-red-400' : 'text-gold'}`} /><p className="mt-4 text-xs text-muted">{label}</p><strong className={`mt-1 block text-lg ${danger ? 'text-red-300' : ''}`}>{value}</strong></article>
}

interface ListItem { id: string; title: string; detail: string; value?: string; danger?: boolean; href?: string }
function DashboardList({ title, empty, items }: { title: string; empty: string; items: ListItem[] }) {
  return <article className="gold-border rounded-3xl bg-surface p-5"><h2 className="font-bold">{title}</h2><div className="mt-4 space-y-1">{items.map((item) => { const content = <><div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted">{item.detail}</p></div>{item.value && <span className={`shrink-0 text-sm font-semibold ${item.danger ? 'text-red-300' : 'text-gold-soft'}`}>{item.value}</span>}</>; return item.href ? <Link key={item.id} to={item.href} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3 hover:bg-raised">{content}</Link> : <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-3">{content}</div>})}{items.length === 0 && <p className="py-5 text-sm text-muted">{empty}</p>}</div></article>
}
