import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return <div className="gold-border rounded-3xl bg-surface px-5 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-gold/10 text-gold"><Icon className="size-6" /></span><h2 className="mt-4 font-bold">{title}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p>{action && <div className="mt-5 flex justify-center">{action}</div>}</div>
}
