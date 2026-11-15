import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { academyKeys, generateMonthlyPayments } from '../../services/academy'

export function FinancialBootstrap() {
  const queryClient = useQueryClient()
  const generation = useQuery({
    queryKey: ['financial-bootstrap'],
    queryFn: generateMonthlyPayments,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
  })

  useEffect(() => {
    if (generation.isSuccess) void queryClient.invalidateQueries({ queryKey: academyKeys.payments })
  }, [generation.isSuccess, queryClient])
  return null
}
