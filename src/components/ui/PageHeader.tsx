import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[.25em] text-gold">{eyebrow}</p>}
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p>}
    </div>
    {action}
  </header>
}
