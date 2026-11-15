import { supabase } from '../lib/supabase/client'
import type { Graduation, GraduationHistory, MonthlyPayment, PaymentDisplayStatus, PaymentMethod, PaymentRecord, Student, StudentStatus, StudentStatusHistory, SystemSettings } from '../types/domain'

function db() {
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

export const academyKeys = {
  students: ['students'] as const,
  student: (id: string) => ['students', id] as const,
  graduations: ['graduations'] as const,
  settings: ['system-settings'] as const,
  payments: ['monthly-payments'] as const,
  paymentRecords: ['payment-records'] as const,
}

export async function listGraduations(): Promise<Graduation[]> {
  const { data, error } = await db().from('graduations').select('*').order('sort_order')
  if (error) throw error
  return data as Graduation[]
}

export async function saveGraduation(input: Omit<Graduation, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
  if (input.id) {
    const { id, ...values } = input
    const { error } = await db().from('graduations').update(values).eq('id', id)
    if (error) throw error
    return id
  }
  const { id: _id, ...values } = input
  const { data, error } = await db().from('graduations').insert(values).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function reorderGraduations(orderedIds: string[]) {
  const { error } = await db().rpc('reorder_graduations', { p_ordered_ids: orderedIds })
  if (error) throw error
}

export async function listStudents(search: string, status: 'all' | StudentStatus): Promise<Student[]> {
  let query = db().from('students').select('*, current_graduation:graduations(*)').order('full_name')
  if (status !== 'all') query = query.eq('status', status)
  if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`)
  const { data, error } = await query
  if (error) throw error
  return data as unknown as Student[]
}

export async function getStudent(id: string): Promise<Student> {
  const { data, error } = await db().from('students').select('*, current_graduation:graduations(*)').eq('id', id).single()
  if (error) throw error
  return data as unknown as Student
}

export interface StudentInput {
  full_name: string
  phone: string
  birth_date: string | null
  training_start_date: string
  current_graduation_id: string
  monthly_fee: number
  due_day: number
  notes: string
  first_payment_mode?: 'full' | 'proportional' | 'custom'
  first_payment_amount?: number | null
}

export async function createStudent(input: StudentInput) {
  const { data, error } = await db().rpc('create_student', {
    p_full_name: input.full_name,
    p_phone: input.phone,
    p_birth_date: input.birth_date,
    p_training_start_date: input.training_start_date,
    p_graduation_id: input.current_graduation_id,
    p_monthly_fee: input.monthly_fee,
    p_due_day: input.due_day,
    p_notes: input.notes,
    p_first_payment_mode: input.first_payment_mode ?? 'full',
    p_first_payment_amount: input.first_payment_amount ?? null,
  })
  if (error) throw error
  return data as string
}

export async function updateStudent(id: string, input: StudentInput) {
  const { error } = await db().rpc('update_student', {
    p_student_id: id,
    p_full_name: input.full_name,
    p_phone: input.phone,
    p_birth_date: input.birth_date,
    p_training_start_date: input.training_start_date,
    p_monthly_fee: input.monthly_fee,
    p_due_day: input.due_day,
    p_notes: input.notes,
  })
  if (error) throw error
}

export async function setStudentStatus(id: string, status: StudentStatus, effectiveDate: string, notes: string) {
  const { error } = await db().rpc('set_student_status', {
    p_student_id: id, p_status: status, p_effective_date: effectiveDate, p_notes: notes,
  })
  if (error) throw error
}

export async function recordGraduation(studentId: string, graduationId: string, graduatedAt: string, notes: string) {
  const { error } = await db().rpc('record_graduation', {
    p_student_id: studentId, p_graduation_id: graduationId, p_graduated_at: graduatedAt, p_notes: notes,
  })
  if (error) throw error
}

export async function listGraduationHistory(studentId: string): Promise<GraduationHistory[]> {
  const { data, error } = await db().from('graduation_history').select('*, graduation:graduations(*)').eq('student_id', studentId).order('graduated_at', { ascending: false })
  if (error) throw error
  return data as unknown as GraduationHistory[]
}

export async function updateGraduationHistory(id: string, graduationId: string, graduatedAt: string, notes: string) {
  const { error } = await db().rpc('correct_graduation_record', { p_history_id: id, p_graduation_id: graduationId, p_graduated_at: graduatedAt, p_notes: notes })
  if (error) throw error
}

export async function listStatusHistory(studentId: string): Promise<StudentStatusHistory[]> {
  const { data, error } = await db().from('student_status_history').select('*').eq('student_id', studentId).order('effective_date', { ascending: false })
  if (error) throw error
  return data as StudentStatusHistory[]
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data, error } = await db().from('system_settings').select('*').eq('singleton', true).single()
  if (error) throw error
  return data as SystemSettings
}

export async function updateSystemSettings(defaultMonthlyFee: number, defaultDueDay: number) {
  const { error } = await db().from('system_settings').update({ default_monthly_fee: defaultMonthlyFee, default_due_day: defaultDueDay }).eq('singleton', true)
  if (error) throw error
}

export async function generateMonthlyPayments() {
  const { data, error } = await db().rpc('generate_monthly_payments', {})
  if (error) throw error
  return data as number
}

export async function listMonthlyPayments(status: 'all' | PaymentDisplayStatus = 'all'): Promise<MonthlyPayment[]> {
  let query = db().from('monthly_payment_details').select('*').order('due_date', { ascending: false })
  if (status !== 'all') query = query.eq('display_status', status)
  const { data, error } = await query
  if (error) throw error
  return (data as Array<MonthlyPayment & { student_name: string; student_status: StudentStatus }>).map((item) => ({
    ...item,
    student: { id: item.student_id, full_name: item.student_name, status: item.student_status },
  }))
}

export async function listStudentPayments(studentId: string): Promise<MonthlyPayment[]> {
  const { data, error } = await db().from('monthly_payment_details').select('*').eq('student_id', studentId).order('competence', { ascending: false })
  if (error) throw error
  return data as MonthlyPayment[]
}

export async function registerPayments(paymentIds: string[], paidAt: string, method: PaymentMethod) {
  const { error } = await db().rpc('register_payments', { p_monthly_payment_ids: paymentIds, p_paid_at: paidAt, p_payment_method: method })
  if (error) throw error
}

export async function payStudentCompetencies(studentId: string, competencies: string[], paidAt: string, method: PaymentMethod) {
  const { error } = await db().rpc('pay_student_competencies', { p_student_id: studentId, p_competencies: competencies, p_paid_at: paidAt, p_payment_method: method })
  if (error) throw error
}

export async function listPaymentRecords(): Promise<PaymentRecord[]> {
  const { data, error } = await db().from('payment_records').select('*, monthly_payment:monthly_payments(*, student:students(id, full_name, status))').order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return data as unknown as PaymentRecord[]
}

export async function listAllStatusHistory(): Promise<StudentStatusHistory[]> {
  const { data, error } = await db().from('student_status_history').select('*, student:students(id, full_name)').order('effective_date', { ascending: false })
  if (error) throw error
  return data as unknown as StudentStatusHistory[]
}

export async function voidPayment(paymentRecordId: string, reason: string) {
  const { error } = await db().rpc('void_payment', { p_payment_record_id: paymentRecordId, p_reason: reason })
  if (error) throw error
}

export async function setMonthlyPaymentCancelled(monthlyPaymentId: string, cancelled: boolean, reason: string) {
  const { error } = await db().rpc('set_monthly_payment_cancelled', { p_monthly_payment_id: monthlyPaymentId, p_cancelled: cancelled, p_reason: reason })
  if (error) throw error
}
