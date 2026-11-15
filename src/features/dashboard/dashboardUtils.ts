import type { Student } from '../../types/domain'

export interface UpcomingBirthday {
  student: Student
  date: Date
  daysUntil: number
}

export function getUpcomingBirthdays(students: Student[], days = 7, reference = new Date()): UpcomingBirthday[] {
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
  return students.flatMap((student) => {
    if (!student.birth_date || student.status !== 'active') return []
    const [, month, day] = student.birth_date.split('-').map(Number)
    let next = new Date(today.getFullYear(), month - 1, day)
    if (next < today) next = new Date(today.getFullYear() + 1, month - 1, day)
    const daysUntil = Math.round((next.getTime() - today.getTime()) / 86_400_000)
    return daysUntil <= days ? [{ student, date: next, daysUntil }] : []
  }).sort((a, b) => a.daysUntil - b.daysUntil || a.student.full_name.localeCompare(b.student.full_name, 'pt-BR'))
}
