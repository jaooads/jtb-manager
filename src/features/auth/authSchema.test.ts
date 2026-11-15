import { describe, expect, it } from 'vitest'
import { loginSchema } from './authSchema'

describe('loginSchema', () => {
  it('aceita credenciais válidas', () => expect(loginSchema.safeParse({ email: 'dani@academia.com', password: 'segura123' }).success).toBe(true))
  it('rejeita e-mail inválido e senha curta', () => expect(loginSchema.safeParse({ email: 'dani', password: '123' }).success).toBe(false))
})
