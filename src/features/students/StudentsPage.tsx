import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, LoaderCircle, Plus, Search, UserRoundX, Users } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/shared/EmptyState'
import { GraduationBadge } from '../../components/shared/GraduationBadge'
import { academyKeys, listStudents } from '../../services/academy'
import { formatCurrency, formatTrainingTime } from '../../utils/format'
import type { StudentStatus } from '../../types/domain'

type Filter = 'all' | StudentStatus

export function StudentsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('active')
  const students = useQuery({ queryKey: [...academyKeys.students, search, filter], queryFn: () => listStudents(search, filter) })

  return <section>
    <PageHeader eyebrow="Academia" title="Alunos" description="Cadastros, graduações e situação dos alunos." action={<Link to="/alunos/novo" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 font-bold text-ink transition hover:bg-gold-soft"><Plus className="size-5" />Novo aluno</Link>} />

    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
      <label className="relative flex-1"><span className="sr-only">Pesquisar aluno</span><Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar por nome" className="h-12 w-full rounded-xl border border-white/10 bg-surface pl-12 pr-4 placeholder:text-zinc-600 focus:border-gold/60" /></label>
      <div className="grid grid-cols-3 rounded-xl bg-surface p-1" aria-label="Filtrar alunos">
        {([['active', 'Ativos'], ['inactive', 'Inativos'], ['all', 'Todos']] as const).map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`min-h-10 rounded-lg px-4 text-sm font-medium ${filter === value ? 'bg-raised text-gold-soft shadow' : 'text-muted'}`}>{label}</button>)}
      </div>
    </div>

    <div className="mt-5">
      {students.isLoading && <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div>}
      {students.isError && <EmptyState icon={UserRoundX} title="Não foi possível carregar" description="Confira sua conexão e se a migration da Etapa 2 foi aplicada no Supabase." />}
      {students.data?.length === 0 && <EmptyState icon={Users} title={search ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'} description={search ? 'Tente pesquisar com outro nome.' : 'Cadastre o primeiro aluno para começar a organizar a academia.'} action={!search && <Link to="/alunos/novo" className="rounded-xl bg-gold px-5 py-3 font-bold text-ink">Cadastrar aluno</Link>} />}
      {!!students.data?.length && <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{students.data.map((student) => <Link key={student.id} to={`/alunos/${student.id}`} className="group gold-border rounded-2xl bg-surface p-5 transition hover:-translate-y-0.5 hover:border-gold/40 hover:bg-raised/80">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h2 className="truncate font-bold">{student.full_name}</h2><div className="mt-2"><GraduationBadge graduation={student.current_graduation} compact /></div></div><ChevronRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-1 group-hover:text-gold" /></div>
        <div className="mt-5 flex items-end justify-between border-t border-white/8 pt-4"><div><p className="text-xs text-muted">Tempo de treino</p><p className="mt-1 text-sm font-medium">{formatTrainingTime(student.training_start_date)}</p></div><div className="text-right"><p className="text-xs text-muted">Mensalidade</p><p className="mt-1 text-sm font-semibold text-gold-soft">{formatCurrency(student.monthly_fee)}</p></div></div>
        {student.status === 'inactive' && <span className="mt-4 inline-block rounded-full bg-white/7 px-3 py-1 text-xs text-muted">Inativo</span>}
      </Link>)}</div>}
    </div>
  </section>
}
