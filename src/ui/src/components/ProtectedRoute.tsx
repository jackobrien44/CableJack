import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <div className="flex items-center justify-center min-h-svh text-gray-400">Loading…</div>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
