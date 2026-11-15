import { describe, expect, it } from 'vitest'
import type { Student } from '../../types/domain'
import { getUpcomingBirthdays } from './dashboardUtils'

function student(name: string, birthDate: string, status: 'active' | 'inactive' = 'active') {
  return { id: name, full_name: name, birth_date: birthDate, status } as Student
}

describe('getUpcomingBirthdays', () => {
  it('lista hoje e próximos sete dias em ordem', () => {
    const result = getUpcomingBirthdays([student('Dia sete', '1990-11-07'), student('Hoje', '1995-11-05')], 7, new Date(2026, 10, 5))
    expect(result.map((item) => item.student.full_name)).toEqual(['Hoje', 'Dia sete'])
    expect(result.map((item) => item.daysUntil)).toEqual([0, 2])
  })
  it('ignora alunos inativos', () => expect(getUpcomingBirthdays([student('Inativo', '1990-11-05', 'inactive')], 7, new Date(2026, 10, 5))).toHaveLength(0))
})
