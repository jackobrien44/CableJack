import { api } from './client'
import type { AccessCheckResult } from '../types/api'

export const billingApi = {
  getStatus: () =>
    api.get<AccessCheckResult>('/billing/status'),

  createCheckout: (successUrl: string, cancelUrl: string) =>
    api.post<{ url: string }>('/billing/checkout', { successUrl, cancelUrl }),

  createPortal: (returnUrl: string) =>
    api.post<{ url: string }>('/billing/portal', { returnUrl }),
}
