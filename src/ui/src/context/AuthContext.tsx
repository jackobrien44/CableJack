import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '../api/auth'
import { AuthContext } from './authContext'
import type { AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthContextValue, 'login' | 'logout' | 'isAuthenticated' | 'isAdmin'>>(() => ({
    user: null,
    isLoading: !!localStorage.getItem('accessToken'),
  }))

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
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

  useEffect(() => {
    const handler = () => setState({ user: null, isLoading: false })
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
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
