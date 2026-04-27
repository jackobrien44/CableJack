import { api } from './client'
import type { AuthResponse } from '../types/api'

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }),

  register: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, password }),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),

  revoke: (refreshToken: string) =>
    api.post<void>('/auth/revoke', { refreshToken }),
}
