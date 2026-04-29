import { createContext } from 'react'
import type { UserResponse } from '../types/api'

interface AuthState {
  user: UserResponse | null
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
