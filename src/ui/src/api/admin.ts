import { api } from './client'
import type { PagedResult, UserResponse, SystemSettingsDto, StreamResponse, DashboardStatsDto, WatchSessionDto, TopChannelDto, UserStatDto } from '../types/api'

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
}
