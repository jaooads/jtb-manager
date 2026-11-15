import { z } from 'zod'

export const studentFormSchema = z.object({
  full_name: z.string().trim().min(2, 'Informe o nome completo.').max(160),
  phone: z.string().max(24),
  birth_date: z.string(),
  training_start_date: z.string().min(1, 'Informe a data de início.'),
  current_graduation_id: z.uuid('Selecione o Prajied atual.'),
  monthly_fee: z.number({ error: 'Informe o valor da mensalidade.' }).min(0, 'O valor não pode ser negativo.'),
  due_day: z.number({ error: 'Informe o dia de vencimento.' }).int().min(1).max(31),
  notes: z.string().max(2000),
  first_payment_mode: z.enum(['full', 'proportional', 'custom']),
  first_payment_amount: z.number().min(0).nullable(),
}).superRefine((values, context) => {
  if (values.first_payment_mode === 'custom' && values.first_payment_amount === null) {
    context.addIssue({ code: 'custom', path: ['first_payment_amount'], message: 'Informe o valor personalizado.' })
  }
})

export type StudentFormValues = z.infer<typeof studentFormSchema>
