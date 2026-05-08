import { createContext } from 'react'
import type { AccessCheckResult } from '../types/api'

export interface BillingContextValue {
  access: AccessCheckResult | null
  isLoading: boolean
  canWatch: boolean
  startCheckout: () => Promise<void>
}

export const BillingContext = createContext<BillingContextValue | null>(null)
