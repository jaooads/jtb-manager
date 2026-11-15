import { describe, expect, it } from 'vitest'
import { calculateProportionalFirstPayment, formatCurrency, maskPhone } from './format'

describe('formatadores brasileiros', () => {
  it('formata moeda em reais', () => expect(formatCurrency(150)).toContain('150,00'))
  it('aplica máscara de celular', () => expect(maskPhone('11999999999')).toBe('(11) 99999-9999'))
  it('limita o telefone a onze dígitos', () => expect(maskPhone('11999999999123')).toBe('(11) 99999-9999'))
  it('calcula proporcional incluindo o dia inicial', () => expect(calculateProportionalFirstPayment(310, '2026-01-16')).toBe(160))
})
