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
import { ApiError } from './api/client'

function makeQueryClient(onError: (msg: string) => void) {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
      mutations: {
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Something went wrong.'
          onError(msg)
        },
      },
    },
  })
}

function AppWithToast() {
  const { toast } = useToast()
  const queryClient = makeQueryClient((msg) => toast(msg, 'error'))

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<ChannelsPage />} />
                <Route path="favorites" element={<FavoritesPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="guide" element={<EpgPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="admin" element={<AdminPage />} />
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
