import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import type { UserResponse } from '../types/api'

interface AuthState {
  user: UserResponse | null
  isLoading: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true })

  // On mount, validate stored token by fetching the user profile
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setState({ user: null, isLoading: false })
      return
    }
    import('../api/user').then(({ userApi }) =>
      userApi.getMe()
        .then(user => setState({ user, isLoading: false }))
        .catch(() => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          setState({ user: null, isLoading: false })
        })
    )
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    localStorage.setItem('accessToken', res.accessToken)
    localStorage.setItem('refreshToken', res.refreshToken)
    setState({ user: res.user, isLoading: false })
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      await authApi.revoke(refreshToken).catch(() => {})
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setState({ user: null, isLoading: false })
  }, [])

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      isAuthenticated: state.user !== null,
      isAdmin: state.user?.role === 'Administrator',
    }}>
      {children}
    </AuthContext.Provider>
  )
}
