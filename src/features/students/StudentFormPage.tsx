import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '../../components/ui/PageHeader'
import { academyKeys, createStudent, getStudent, getSystemSettings, listGraduations, updateStudent } from '../../services/academy'
import { calculateProportionalFirstPayment, formatCurrency, maskPhone, todayInBrazil } from '../../utils/format'
import { studentFormSchema, type StudentFormValues } from './studentSchema'

const inputClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-raised px-4 text-base placeholder:text-zinc-600 focus:border-gold/60 disabled:opacity-60'

export function StudentFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const graduations = useQuery({ queryKey: academyKeys.graduations, queryFn: listGraduations })
  const settings = useQuery({ queryKey: academyKeys.settings, queryFn: getSystemSettings, enabled: !editing })
  const student = useQuery({ queryKey: academyKeys.student(id ?? ''), queryFn: () => getStudent(id!), enabled: editing })
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: { full_name: '', phone: '', birth_date: '', training_start_date: todayInBrazil(), current_graduation_id: '', monthly_fee: 0, due_day: 10, notes: '', first_payment_mode: 'full', first_payment_amount: null },
  })

  useEffect(() => {
    if (!editing && settings.data) {
      setValue('monthly_fee', Number(settings.data.default_monthly_fee))
      setValue('due_day', settings.data.default_due_day)
    }
  }, [editing, settings.data, setValue])

  useEffect(() => {
    if (!student.data) return
    reset({
      full_name: student.data.full_name, phone: student.data.phone ?? '', birth_date: student.data.birth_date ?? '',
      training_start_date: student.data.training_start_date, current_graduation_id: student.data.current_graduation_id,
      monthly_fee: Number(student.data.monthly_fee), due_day: student.data.due_day, notes: student.data.notes ?? '', first_payment_mode: 'full', first_payment_amount: null,
    })
  }, [student.data, reset])

  const save = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      const input = { ...values, birth_date: values.birth_date || null }
      if (id) { await updateStudent(id, input); return id }
      return createStudent(input)
    },
    onSuccess: async (studentId) => {
      await queryClient.invalidateQueries({ queryKey: academyKeys.students })
      toast.success(editing ? 'Aluno atualizado.' : 'Aluno cadastrado.')
      navigate(`/alunos/${studentId}`, { replace: true })
    },
    onError: () => toast.error('Não foi possível salvar. Verifique os campos e tente novamente.'),
  })

  const activeGraduations = graduations.data?.filter((item) => item.is_active) ?? []
  const phone = watch('phone')
  const monthlyFee = watch('monthly_fee') || 0
  const firstPaymentMode = watch('first_payment_mode')
  const firstPaymentAmount = watch('first_payment_amount')
  const firstPaymentPreview = firstPaymentMode === 'full'
    ? monthlyFee
    : firstPaymentMode === 'proportional'
      ? calculateProportionalFirstPayment(monthlyFee)
      : firstPaymentAmount ?? 0

  if (student.isLoading) return <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div>

  return <section className="mx-auto max-w-3xl">
    <Link to={editing ? `/alunos/${id}` : '/alunos'} className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-copy"><ArrowLeft className="size-4" />Voltar</Link>
    <PageHeader eyebrow={editing ? 'Editar cadastro' : 'Novo cadastro'} title={editing ? student.data?.full_name ?? 'Aluno' : 'Novo aluno'} description={editing ? 'Atualize os dados cadastrais. A troca de Prajied é feita no perfil para preservar o histórico.' : 'Preencha os dados essenciais. O financeiro começa no mês do cadastro.'} />

    {!editing && !graduations.isLoading && activeGraduations.length === 0 ? <div className="gold-border mt-7 rounded-2xl bg-surface p-6"><h2 className="font-bold">Cadastre um Prajied primeiro</h2><p className="mt-2 text-sm text-muted">Todo aluno precisa ter um Prajied atual.</p><Link to="/prajieds" className="mt-5 inline-flex rounded-xl bg-gold px-5 py-3 font-bold text-ink">Configurar Prajieds</Link></div> :
    <form onSubmit={handleSubmit((values) => save.mutate(values))} className="gold-border mt-7 rounded-3xl bg-surface p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-medium">Nome completo *<input {...register('full_name')} autoComplete="name" className={inputClass} placeholder="Nome do aluno" />{errors.full_name && <span className="mt-1 block text-xs text-red-400">{errors.full_name.message}</span>}</label>
        <label className="text-sm font-medium">Telefone / WhatsApp<input {...register('phone')} value={phone} onChange={(event) => setValue('phone', maskPhone(event.target.value))} inputMode="tel" autoComplete="tel" className={inputClass} placeholder="(00) 00000-0000" /></label>
        <label className="text-sm font-medium">Data de nascimento<input {...register('birth_date')} type="date" max={todayInBrazil()} className={inputClass} /></label>
        <label className="text-sm font-medium">Início dos treinos *<input {...register('training_start_date')} type="date" max={todayInBrazil()} className={inputClass} />{errors.training_start_date && <span className="mt-1 block text-xs text-red-400">{errors.training_start_date.message}</span>}</label>
        <label className="text-sm font-medium">Prajied atual *{editing ? <><input type="hidden" {...register('current_graduation_id')} /><div className={`${inputClass} flex items-center text-muted`}>{student.data?.current_graduation?.name}</div></> : <select {...register('current_graduation_id')} className={inputClass}><option value="">Selecione</option>{activeGraduations.map((graduation) => <option key={graduation.id} value={graduation.id}>{graduation.name}</option>)}</select>}{errors.current_graduation_id && <span className="mt-1 block text-xs text-red-400">{errors.current_graduation_id.message}</span>}</label>
        <label className="text-sm font-medium">Mensalidade *<span className="relative block"><span className="absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-sm text-muted">R$</span><input {...register('monthly_fee', { valueAsNumber: true })} type="number" inputMode="decimal" min="0" step="0.01" className={`${inputClass} pl-11`} /></span>{errors.monthly_fee && <span className="mt-1 block text-xs text-red-400">{errors.monthly_fee.message}</span>}</label>
        <label className="text-sm font-medium">Dia de vencimento *<input {...register('due_day', { valueAsNumber: true })} type="number" inputMode="numeric" min="1" max="31" className={inputClass} />{errors.due_day && <span className="mt-1 block text-xs text-red-400">Use um dia entre 1 e 31.</span>}</label>
        <label className="sm:col-span-2 text-sm font-medium">Observações<textarea {...register('notes')} rows={4} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-raised p-4 text-base placeholder:text-zinc-600 focus:border-gold/60" placeholder="Informações importantes sobre o aluno" /></label>
        {!editing && <fieldset className="sm:col-span-2 rounded-2xl border border-gold/20 bg-ink/40 p-4 sm:p-5"><legend className="px-2 text-sm font-bold text-gold-soft">Primeira mensalidade</legend><p className="mb-4 text-xs leading-5 text-muted">Essa escolha vale somente para o mês do cadastro e não altera as próximas mensalidades.</p><div className="grid gap-2 sm:grid-cols-3">{([['full', 'Integral'], ['proportional', 'Proporcional'], ['custom', 'Personalizado']] as const).map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${firstPaymentMode === value ? 'border-gold bg-gold/10 text-gold-soft' : 'border-white/10 bg-surface text-muted'}`}><input {...register('first_payment_mode')} type="radio" value={value} className="accent-gold" />{label}</label>)}</div>{firstPaymentMode === 'custom' && <label className="mt-4 block text-sm font-medium">Valor personalizado<span className="relative block"><span className="absolute left-4 top-1/2 mt-1 -translate-y-1/2 text-sm text-muted">R$</span><input {...register('first_payment_amount', { setValueAs: (value) => value === '' ? null : Number(value) })} type="number" min="0" step="0.01" inputMode="decimal" className={`${inputClass} pl-11`} /></span>{errors.first_payment_amount && <span className="mt-1 block text-xs text-red-400">{errors.first_payment_amount.message}</span>}</label>}<div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4"><span className="text-sm text-muted">Valor previsto</span><strong className="text-lg text-gold-soft">{formatCurrency(firstPaymentPreview)}</strong></div></fieldset>}
      </div>
      <button disabled={save.isPending} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink transition hover:bg-gold-soft disabled:opacity-60 sm:ml-auto sm:w-auto sm:px-7">{save.isPending ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}{editing ? 'Salvar alterações' : 'Cadastrar aluno'}</button>
    </form>}
  </section>
}
