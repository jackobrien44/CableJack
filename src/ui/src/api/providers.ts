import { api } from './client'
import type { ImportResult, ProviderResponse } from '../types/api'

export interface CreateProviderRequest {
  name: string
  baseUrl?: string
  username?: string
  password?: string
  maxConcurrentStreams?: number
  expiresAt?: string
}

export interface UpdateProviderRequest {
  name?: string
  baseUrl?: string
  username?: string
  password?: string
  maxConcurrentStreams?: number
  expiresAt?: string
}

export const providersApi = {
  getAll: () => api.get<ProviderResponse[]>('/providers'),
  getById: (id: number) => api.get<ProviderResponse>(`/providers/${id}`),
  create: (body: CreateProviderRequest) => api.post<ProviderResponse>('/providers', body),
  update: (id: number, body: UpdateProviderRequest) => api.put<ProviderResponse>(`/providers/${id}`, body),
  delete: (id: number) => api.delete<void>(`/providers/${id}`),
  import: (id: number) => api.post<ImportResult>(`/providers/${id}/import`),
  importEpg: (id: number) => api.post<ImportResult>(`/providers/${id}/import-epg`),
}
