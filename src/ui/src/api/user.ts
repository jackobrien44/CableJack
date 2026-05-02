import { api } from './client'
import type { ChannelResponse, PagedResult, UserResponse, UserStatsDto, WatchHistoryResponse } from '../types/api'

export const userApi = {
  getMe: () => api.get<UserResponse>('/users/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<void>('/users/me/password', { currentPassword, newPassword }),

  getFavorites: () => api.get<ChannelResponse[]>('/users/me/favorites'),
  addFavorite: (channelId: number) => api.post<void>(`/users/me/favorites/${channelId}`),
  removeFavorite: (channelId: number) => api.delete<void>(`/users/me/favorites/${channelId}`),

  getHistory: (page = 1, pageSize = 20) =>
    api.get<PagedResult<WatchHistoryResponse>>(`/users/me/history?page=${page}&pageSize=${pageSize}`),
  deleteHistoryEntry: (id: number) => api.delete<void>(`/users/me/history/${id}`),

  getStats: () => api.get<UserStatsDto>('/users/me/stats'),
}
