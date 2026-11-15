import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, Edit3, LoaderCircle, Medal, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState } from '../../components/shared/EmptyState'
import { GraduationBadge } from '../../components/shared/GraduationBadge'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { academyKeys, listGraduations, reorderGraduations, saveGraduation } from '../../services/academy'
import type { Graduation } from '../../types/domain'

const schema = z.object({ name: z.string().trim().min(1, 'Informe o nome.'), primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/), secondary_color: z.string(), is_active: z.boolean() })
type Values = z.infer<typeof schema>
const inputClass = 'mt-2 h-12 w-full rounded-xl border border-white/10 bg-raised px-4 focus:border-gold/60'

export function GraduationsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: academyKeys.graduations, queryFn: listGraduations })
  const [editing, setEditing] = useState<Graduation | null | 'new'>(null)
  const reorder = useMutation({ mutationFn: reorderGraduations, onSuccess: () => queryClient.invalidateQueries({ queryKey: academyKeys.graduations }), onError: () => toast.error('Não foi possível reorganizar.') })

  function move(index: number, direction: -1 | 1) {
    if (!query.data) return
    const target = index + direction
    if (target < 0 || target >= query.data.length) return
    const reordered = [...query.data]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    reorder.mutate(reordered.map((item) => item.id))
  }

  return <section>
    <Link to="/mais" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-copy"><ArrowLeft className="size-4" />Mais</Link>
    <PageHeader eyebrow="Configuração global" title="Prajieds" description="A sequência inicial já vem pronta para toda a academia. Você ainda pode editar, reorganizar ou incluir uma graduação específica." action={<button onClick={() => setEditing('new')} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gold px-5 font-bold text-ink"><Plus className="size-5" />Novo Prajied</button>} />
    <div className="mt-7">{query.isLoading && <div className="grid min-h-48 place-items-center"><LoaderCircle className="size-7 animate-spin text-gold" /></div>}{query.data?.length === 0 && <EmptyState icon={Medal} title="Nenhum Prajied configurado" description="Cadastre as graduações da academia na ordem em que são utilizadas." action={<button onClick={() => setEditing('new')} className="rounded-xl bg-gold px-5 py-3 font-bold text-ink">Cadastrar Prajied</button>} />}{!!query.data?.length && <div className="space-y-3">{query.data.map((graduation, index) => <article key={graduation.id} className="gold-border flex items-center gap-3 rounded-2xl bg-surface p-4 sm:p-5"><div className="min-w-0 flex-1"><GraduationBadge graduation={graduation} /><p className="mt-1 text-xs text-muted">{graduation.is_active ? 'Ativo para novos registros' : 'Inativo'}</p></div><div className="flex gap-1"><button onClick={() => move(index, -1)} disabled={index === 0 || reorder.isPending} aria-label="Mover para cima" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-raised disabled:opacity-25"><ArrowUp className="size-4" /></button><button onClick={() => move(index, 1)} disabled={index === query.data.length - 1 || reorder.isPending} aria-label="Mover para baixo" className="grid size-10 place-items-center rounded-lg text-muted hover:bg-raised disabled:opacity-25"><ArrowDown className="size-4" /></button><button onClick={() => setEditing(graduation)} aria-label="Editar Prajied" className="grid size-10 place-items-center rounded-lg text-gold hover:bg-gold/10"><Edit3 className="size-4" /></button></div></article>)}</div>}</div>
    <GraduationEditor graduation={editing === 'new' ? undefined : editing ?? undefined} open={editing !== null} nextOrder={query.data?.length ?? 0} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await queryClient.invalidateQueries({ queryKey: academyKeys.graduations }) }} />
  </section>
}

function GraduationEditor({ graduation, open, nextOrder, onClose, onSaved }: { graduation?: Graduation; open: boolean; nextOrder: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: '', primary_color: '#D4AF37', secondary_color: '', is_active: true } })
  useEffect(() => { reset(graduation ? { name: graduation.name, primary_color: graduation.primary_color, secondary_color: graduation.secondary_color ?? '', is_active: graduation.is_active } : { name: '', primary_color: '#D4AF37', secondary_color: '', is_active: true }) }, [graduation, open, reset])
  const save = useMutation({ mutationFn: (values: Values) => saveGraduation({ id: graduation?.id, ...values, secondary_color: values.secondary_color || null, sort_order: graduation?.sort_order ?? nextOrder }), onSuccess: async () => { toast.success(graduation ? 'Prajied atualizado.' : 'Prajied cadastrado.'); await onSaved() }, onError: () => toast.error('Não foi possível salvar. Verifique se o nome já existe.') })
  return <Modal open={open} onClose={onClose} title={graduation ? 'Editar Prajied' : 'Novo Prajied'}><form onSubmit={handleSubmit((values) => save.mutate(values))}><label className="text-sm font-medium">Nome<input {...register('name')} className={inputClass} placeholder="Ex.: Branco ponta vermelha" />{errors.name && <span className="mt-1 block text-xs text-red-400">{errors.name.message}</span>}</label><div className="mt-4 grid grid-cols-2 gap-4"><label className="text-sm font-medium">Cor principal<span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-raised px-3"><input {...register('primary_color')} type="color" className="size-8 cursor-pointer border-0 bg-transparent" /><span className="text-xs text-muted">{watch('primary_color')}</span></span></label><label className="text-sm font-medium">Cor secundária<span className="mt-2 flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-raised px-3"><input {...register('secondary_color')} type="color" disabled={!watch('secondary_color')} className="size-8 cursor-pointer border-0 bg-transparent disabled:opacity-30" /><button type="button" onClick={() => reset({ ...watch(), secondary_color: watch('secondary_color') ? '' : '#FFFFFF' })} className="text-xs text-gold-soft">{watch('secondary_color') ? 'Remover' : 'Adicionar'}</button></span></label></div><label className="mt-5 flex items-center gap-3 text-sm"><input {...register('is_active')} type="checkbox" className="size-5 accent-gold" />Disponível para novos registros</label><button disabled={save.isPending} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gold font-bold text-ink disabled:opacity-60">{save.isPending && <LoaderCircle className="size-5 animate-spin" />}Salvar Prajied</button></form></Modal>
}
