import { api } from './client'
import type { PagedResult, UserResponse } from '../types/api'

export interface UpdateUserRequest {
  isActive?: boolean
  role?: 'User' | 'Administrator'
}

export const adminApi = {
  getUsers: (page = 1, pageSize = 20) =>
    api.get<PagedResult<UserResponse>>(`/admin/users?page=${page}&pageSize=${pageSize}`),

  updateUser: (userId: number, body: UpdateUserRequest) =>
    api.put<UserResponse>(`/admin/users/${userId}`, body),

  deleteUser: (userId: number) =>
    api.delete<void>(`/admin/users/${userId}`),
}
