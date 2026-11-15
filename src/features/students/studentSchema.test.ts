import { describe, expect, it } from 'vitest'
import { studentFormSchema } from './studentSchema'

const validStudent = {
  full_name: 'Maria da Silva',
  phone: '(11) 99999-9999',
  birth_date: '1995-05-10',
  training_start_date: '2025-01-10',
  current_graduation_id: '3f0f74c8-f74c-4f5b-b22a-091b216ee74d',
  monthly_fee: 150,
  due_day: 10,
  notes: '',
  first_payment_mode: 'full' as const,
  first_payment_amount: null,
}

describe('studentFormSchema', () => {
  it('aceita um cadastro completo válido', () => expect(studentFormSchema.safeParse(validStudent).success).toBe(true))
  it('rejeita vencimento fora do intervalo', () => expect(studentFormSchema.safeParse({ ...validStudent, due_day: 32 }).success).toBe(false))
  it('rejeita mensalidade negativa', () => expect(studentFormSchema.safeParse({ ...validStudent, monthly_fee: -1 }).success).toBe(false))
  it('exige valor quando a primeira mensalidade é personalizada', () => expect(studentFormSchema.safeParse({ ...validStudent, first_payment_mode: 'custom' }).success).toBe(false))
})
