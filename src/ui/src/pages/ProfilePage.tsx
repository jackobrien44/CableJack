import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { userApi } from '../api/user'
import { useAuth } from '../hooks/useAuth'
import { ApiError } from '../api/client'

export default function ProfilePage() {
  const { user, logout } = useAuth()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: userApi.getStats,
  })

  const changePassword = useMutation({
    mutationFn: () => userApi.changePassword(current, next),
    onSuccess: () => {
      toast.success('Password changed.')
      setCurrent('')
      setNext('')
      setConfirm('')
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to change password.')
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (next !== confirm) {
      toast.error('New passwords do not match.')
      return
    }
    changePassword.mutate()
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
    <div className="p-6 max-w-md">
      <h1 className="text-xl font-semibold text-white mb-6">Profile</h1>

      <div className="bg-gray-800 rounded-xl p-5 mb-6">
        <p className="text-gray-400 text-xs mb-1">Username</p>
        <p className="text-white font-medium">{user?.username}</p>
        <p className="text-gray-400 text-xs mt-3 mb-1">Role</p>
        <p className="text-white">{user?.role}</p>
        <p className="text-gray-400 text-xs mt-3 mb-1">Member since</p>
        <p className="text-white text-sm">{user ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Favorites" value={stats?.favoriteCount ?? '—'} />
        <StatCard label="Sessions" value={stats?.historyCount ?? '—'} />
        <StatCard label="Watch time" value={stats ? fmtWatchTime(stats.totalWatchSeconds) : '—'} />
      </div>

      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-4">Change password</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-gray-400 text-xs mb-1">Current password</label>
            <input
              type="password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">New password</label>
            <input
              type="password"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors mt-1"
          >
            {changePassword.isPending ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </div>

      <button
        onClick={logout}
        className="md:hidden mt-6 w-full text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 hover:bg-gray-800 px-4 py-2.5 rounded-lg transition-colors"
      >
        Sign out
      </button>
    </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-1">
      <p className="text-white font-semibold text-xl">{value}</p>
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
  )
}

function fmtWatchTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
