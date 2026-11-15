import { format, intervalToDuration, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(value)

export const formatDate = (value?: string | null) => value
  ? format(parseISO(value), 'dd/MM/yyyy', { locale: ptBR })
  : 'Não informado'

export const formatCompetence = (value: string) => format(parseISO(value), 'MMMM/yyyy', { locale: ptBR })

export function formatTrainingTime(startDate: string) {
  const duration = intervalToDuration({ start: parseISO(startDate), end: new Date() })
  const parts: string[] = []
  if (duration.years) parts.push(`${duration.years} ${duration.years === 1 ? 'ano' : 'anos'}`)
  if (duration.months) parts.push(`${duration.months} ${duration.months === 1 ? 'mês' : 'meses'}`)
  if (!parts.length && duration.days !== undefined) parts.push(`${duration.days} ${duration.days === 1 ? 'dia' : 'dias'}`)
  return parts.slice(0, 2).join(' e ')
}

export function todayInBrazil() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function calculateProportionalFirstPayment(monthlyFee: number, startDate = todayInBrazil()) {
  const start = parseISO(startDate)
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate()
  const includedDays = lastDay - start.getDate() + 1
  return Math.round((monthlyFee * includedDays / lastDay) * 100) / 100
}
