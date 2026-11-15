export interface Graduation {
  id: string
  name: string
  primary_color: string
  secondary_color: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type StudentStatus = 'active' | 'inactive'

export interface Student {
  id: string
  full_name: string
  phone: string | null
  birth_date: string | null
  training_start_date: string
  current_graduation_id: string
  monthly_fee: number
  due_day: number
  notes: string | null
  status: StudentStatus
  registration_date: string
  financial_start_month: string
  deactivated_at: string | null
  created_at: string
  updated_at: string
  current_graduation?: Graduation
}

export interface GraduationHistory {
  id: string
  student_id: string
  graduation_id: string
  graduated_at: string
  notes: string | null
  created_at: string
  graduation?: Graduation
}

export interface StudentStatusHistory {
  id: string
  student_id: string
  status: StudentStatus
  effective_date: string
  notes: string | null
  created_at: string
  student?: Pick<Student, 'id' | 'full_name'>
}

export interface SystemSettings {
  singleton: boolean
  default_monthly_fee: number
  default_due_day: number
  created_at: string
  updated_at: string
}

export type PaymentDisplayStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'pix' | 'cash' | 'card' | 'transfer'

export interface MonthlyPayment {
  id: string
  student_id: string
  competence: string
  due_date: string
  amount: number
  state: 'pending' | 'paid' | 'cancelled'
  display_status: PaymentDisplayStatus
  cancellation_reason: string | null
  active_payment_record_id: string | null
  paid_at: string | null
  payment_method: PaymentMethod | null
  created_at: string
  updated_at: string
  student?: Pick<Student, 'id' | 'full_name' | 'status'>
}

export interface PaymentRecord {
  id: string
  monthly_payment_id: string
  paid_at: string
  payment_method: PaymentMethod
  amount: number
  created_at: string
  voided_at: string | null
  void_reason: string | null
  monthly_payment?: MonthlyPayment
}
