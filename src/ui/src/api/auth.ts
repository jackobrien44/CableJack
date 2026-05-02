import { api } from './client'
import type { AuthResponse } from '../types/api'

export const authApi = {
  login: (username: string, password: string, rememberMe = false) =>
    api.post<AuthResponse>('/auth/login', { username, password, rememberMe }),

  register: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, password }),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }),

  revoke: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }),
}
