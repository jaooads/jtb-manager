import type { Graduation } from '../../types/domain'

export function GraduationBadge({ graduation, compact = false }: { graduation?: Graduation; compact?: boolean }) {
  if (!graduation) return <span className="text-sm text-muted">Sem Prajied</span>
  return <span className="inline-flex items-center gap-2 text-sm font-medium">
    <span aria-hidden className={`${compact ? 'h-2.5 w-8' : 'h-3 w-10'} rounded-full border border-white/20`} style={{ background: graduation.secondary_color ? `linear-gradient(90deg, ${graduation.primary_color} 50%, ${graduation.secondary_color} 50%)` : graduation.primary_color }} />
    {graduation.name}
  </span>
}
