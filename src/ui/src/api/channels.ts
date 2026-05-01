import { api } from './client'
import type { ChannelResponse, PagedResult } from '../types/api'

export interface GetChannelsParams {
  page?: number
  pageSize?: number
  categoryId?: number
  providerId?: number
  search?: string
}

export interface CreateChannelRequest {
  name: string
  sourceUrl: string
  categoryId: number
  tvgId?: string
  logoUrl?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateChannelRequest {
  name?: string
  sourceUrl?: string
  categoryId?: number
  tvgId?: string
  logoUrl?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
}

export const channelsApi = {
  getAll: ({ page = 1, pageSize = 50, categoryId, providerId, search }: GetChannelsParams = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (categoryId !== undefined) params.set('categoryId', String(categoryId))
    if (providerId !== undefined) params.set('providerId', String(providerId))
    if (search) params.set('search', search)
    return api.get<PagedResult<ChannelResponse>>(`/channels?${params}`)
  },

  getRecent: (count = 20) => api.get<ChannelResponse[]>(`/channels/recent?count=${count}`),

  getById: (id: number) => api.get<ChannelResponse>(`/channels/${id}`),

  create: (req: CreateChannelRequest) => api.post<ChannelResponse>('/channels', req),

  update: (id: number, req: UpdateChannelRequest) => api.put<ChannelResponse>(`/channels/${id}`, req),

  delete: (id: number) => api.delete<void>(`/channels/${id}`),

  deleteAll: () => api.delete<{ deleted: number }>('/channels'),
}
