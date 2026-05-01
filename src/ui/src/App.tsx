import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, toast } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import ChannelsPage from './pages/ChannelsPage'
import FavoritesPage from './pages/FavoritesPage'
import PlayerPage from './pages/PlayerPage'
import AdminPage from './pages/AdminPage'
import EpgPage from './pages/EpgPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import ChannelPage from './pages/ChannelPage'
import HomePage from './pages/HomePage'
import { ApiError } from './api/client'
import { useStopStreamsOnExit } from './hooks/useStopStreamsOnExit'

export default function App() {
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
          toast.error(msg)
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
                <Route index element={<HomePage />} />
                <Route path="channels" element={<ChannelsPage />} />
                <Route path="categories/:categoryId" element={<ChannelsPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="guide" element={<EpgPage />} />
                <Route path="channels/:id" element={<ChannelPage />} />
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
        <Toaster
          theme="dark"
          position="bottom-right"
          richColors
          toastOptions={{ style: { fontFamily: "system-ui, 'Segoe UI', sans-serif" } }}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}
