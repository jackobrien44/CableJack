import { api } from './client'
import type { ChannelResponse, PagedResult } from '../types/api'

export interface GetChannelsParams {
  page?: number
  pageSize?: number
  categoryId?: number
  providerId?: number
  search?: string
}

export const channelsApi = {
  getAll: ({ page = 1, pageSize = 50, categoryId, providerId, search }: GetChannelsParams = {}) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (categoryId !== undefined) params.set('categoryId', String(categoryId))
    if (providerId !== undefined) params.set('providerId', String(providerId))
    if (search) params.set('search', search)
    return api.get<PagedResult<ChannelResponse>>(`/channels?${params}`)
  },

  getById: (id: number) => api.get<ChannelResponse>(`/channels/${id}`),

  deleteAll: () => api.delete<{ deleted: number }>('/channels'),
}
