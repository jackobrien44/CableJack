import { api } from './client'
import type { AuditLogDto, PagedResult, UserResponse, SystemSettingsDto, StreamResponse, DashboardStatsDto, WatchSessionDto, TopChannelDto, UserStatDto, UserBillingDto } from '../types/api'

export interface UpdateUserRequest {
  isActive?: boolean
  role?: 'User' | 'Administrator'
}

export interface CreateUserRequest {
  username: string
  password: string
  role?: 'User' | 'Administrator'
  isActive?: boolean
}

export const adminApi = {
  getDashboardStats: () =>
    api.get<DashboardStatsDto>('/admin/dashboard'),

  getDashboardRecentHistory: () =>
    api.get<WatchSessionDto[]>('/admin/dashboard/recent-history'),

  getDashboardTopChannels: () =>
    api.get<TopChannelDto[]>('/admin/dashboard/top-channels'),

  getDashboardUserStats: () =>
    api.get<UserStatDto[]>('/admin/dashboard/user-stats'),

  getDashboardErrors: () =>
    api.get<StreamResponse[]>('/admin/dashboard/errors'),

  getAdminHistory: (page = 1, pageSize = 50, userId?: number, search?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (userId) params.set('userId', String(userId))
    if (search) params.set('search', search)
    return api.get<PagedResult<WatchSessionDto>>(`/admin/history?${params}`)
  },

  getActiveStreams: (page = 1, pageSize = 50) =>
    api.get<PagedResult<StreamResponse>>(`/admin/streams?page=${page}&pageSize=${pageSize}`),

  adminStopStream: (id: number) =>
    api.post<StreamResponse>(`/admin/streams/${id}/stop`, {}),

  getSettings: () =>
    api.get<SystemSettingsDto>('/admin/settings'),

  updateSettings: (body: SystemSettingsDto) =>
    api.put<SystemSettingsDto>('/admin/settings', body),

  getUsers: (page = 1, pageSize = 20) =>
    api.get<PagedResult<UserResponse>>(`/admin/users?page=${page}&pageSize=${pageSize}`),

  createUser: (body: CreateUserRequest) =>
    api.post<UserResponse>('/admin/users', body),

  updateUser: (userId: number, body: UpdateUserRequest) =>
    api.put<UserResponse>(`/admin/users/${userId}`, body),

  resetPassword: (userId: number, newPassword: string) =>
    api.post<void>(`/admin/users/${userId}/reset-password`, { newPassword }),

  deleteUser: (userId: number) =>
    api.delete<void>(`/admin/users/${userId}`),

  getAuditLogs: (page = 1, pageSize = 50, search?: string, action?: string) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) params.set('search', search)
    if (action) params.set('action', action)
    return api.get<PagedResult<AuditLogDto>>(`/admin/audit?${params}`)
  },

  getAllBillingStates: () =>
    api.get<UserBillingDto[]>('/admin/billing/users'),

  setFreeAccess: (userId: number, freeAccess: boolean, reason?: string) =>
    api.put<void>(`/admin/billing/users/${userId}/free-access`, { freeAccess, reason }),

  setTrialExpiry: (userId: number, trialExpiresAt: string | null) =>
    api.put<void>(`/admin/billing/users/${userId}/trial`, { trialExpiresAt }),
}
