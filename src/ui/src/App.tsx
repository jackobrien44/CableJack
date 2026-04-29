import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider, useToast } from './context/ToastContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ChannelsPage from './pages/ChannelsPage'
import FavoritesPage from './pages/FavoritesPage'
import HistoryPage from './pages/HistoryPage'
import PlayerPage from './pages/PlayerPage'
import AdminPage from './pages/AdminPage'
import EpgPage from './pages/EpgPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import { ApiError } from './api/client'
import { useStopStreamsOnExit } from './hooks/useStopStreamsOnExit'

function AppWithToast() {
  const { toast } = useToast()
  useStopStreamsOnExit()
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Something went wrong.'
          toast(msg, 'error')
        },
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<ChannelsPage />} />
                <Route path="categories/:categoryId" element={<ChannelsPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="guide" element={<EpgPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="admin" element={<AdminPage />} />
                </Route>
              </Route>
              <Route path="player/:id" element={<PlayerPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppWithToast />
    </ToastProvider>
  )
}
