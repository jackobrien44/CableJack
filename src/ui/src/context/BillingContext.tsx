import { useCallback, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { billingApi } from '../api/billing'
import { BillingContext } from './billingContextDef'
import { useAuth } from '../hooks/useAuth'

export function BillingProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin } = useAuth()

  const { data: access, isLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: billingApi.getStatus,
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const canWatch = isAdmin || !access?.enforcementActive || (access?.hasAccess ?? true)

  const startCheckout = useCallback(async () => {
    const origin = window.location.origin
    const { url } = await billingApi.createCheckout(
      `${origin}/`,
      window.location.href,
    )
    window.location.href = url
  }, [])

  return (
    <BillingContext.Provider value={{ access: access ?? null, isLoading, canWatch, startCheckout }}>
      {children}
    </BillingContext.Provider>
  )
}
