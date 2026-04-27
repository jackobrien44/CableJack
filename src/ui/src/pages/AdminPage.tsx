import { useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type UpdateUserRequest } from '../api/admin'
import { useAuth } from '../hooks/useAuth'
import type { ImportResult, UserResponse } from '../types/api'

type Tab = 'imports' | 'users'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('imports')

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Admin</h1>

      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {(['imports', 'users'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'imports' && <ImportsTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}

// ── Imports tab ───────────────────────────────────────────���──────────────────

function ImportsTab() {
  const [m3uResult, setM3uResult] = useState<ImportResult | null>(null)
  const [epgResult, setEpgResult] = useState<ImportResult | null>(null)

  const importM3U = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/admin/channels/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ImportResult>
    },
    onSuccess: setM3uResult,
  })

  const importEPG = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/epg/import', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ImportResult>
    },
    onSuccess: setEpgResult,
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <ImportCard
        title="Import M3U Playlist"
        description="Upload an .m3u or .m3u8 file to create or update channels."
        accept=".m3u,.m3u8"
        loading={importM3U.isPending}
        result={m3uResult}
        error={importM3U.error?.message}
        onFile={f => importM3U.mutate(f)}
      />
      <ImportCard
        title="Import EPG (XMLTV)"
        description="Upload an XMLTV file to populate programme listings."
        accept=".xml,.xmltv"
        loading={importEPG.isPending}
        result={epgResult}
        error={importEPG.error?.message}
        onFile={f => importEPG.mutate(f)}
      />
    </div>
  )
}

interface ImportCardProps {
  title: string
  description: string
  accept: string
  loading: boolean
  result: ImportResult | null
  error?: string
  onFile: (f: File) => void
}

function ImportCard({ title, description, accept, loading, result, error, onFile }: ImportCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <h2 className="text-white font-medium mb-1">{title}</h2>
      <p className="text-gray-400 text-sm mb-4">{description}</p>

      <label className={`inline-block cursor-pointer bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
        {loading ? 'Importing…' : 'Choose file'}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
      </label>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="mt-3 text-sm space-y-1">
          <p className="text-green-400">Import complete</p>
          <p className="text-gray-400">
            Channels created: {result.channelsCreated} · updated: {result.channelsUpdated} · categories: {result.categoriesCreated}
          </p>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="text-yellow-400 cursor-pointer">
                {result.errors.length} warning{result.errors.length > 1 ? 's' : ''}
              </summary>
              <ul className="mt-1 space-y-0.5 text-gray-500 text-xs">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

// ── Users tab ───────────────────────────────────��────────────────────────────

function UsersTab() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['admin-users'],
    queryFn: ({ pageParam = 1 }) => adminApi.getUsers(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasNextPage ? last.page + 1 : undefined,
  })

  const updateUser = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: UpdateUserRequest }) =>
      adminApi.updateUser(userId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const deleteUser = useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const users = data?.pages.flatMap(p => p.items) ?? []

  if (isLoading) return <div className="text-gray-400 text-sm">Loading users…</div>

  return (
    <div className="max-w-3xl">
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Username</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users.map(user => (
              <UserRow
                key={user.id}
                user={user}
                isSelf={user.id === currentUser?.id}
                onToggleRole={() => updateUser.mutate({
                  userId: user.id,
                  body: { role: user.role === 'Administrator' ? 'User' : 'Administrator' },
                })}
                onToggleActive={() => updateUser.mutate({
                  userId: user.id,
                  body: { isActive: !user.isActive },
                })}
                onDelete={() => {
                  if (confirm(`Delete user "${user.username}"? This cannot be undone.`)) {
                    deleteUser.mutate(user.id)
                  }
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="mt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition-colors"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

interface UserRowProps {
  user: UserResponse
  isSelf: boolean
  onToggleRole: () => void
  onToggleActive: () => void
  onDelete: () => void
}

function UserRow({ user, isSelf, onToggleRole, onToggleActive, onDelete }: UserRowProps) {
  return (
    <tr className="hover:bg-gray-750">
      <td className="px-4 py-3 text-white font-medium">
        {user.username}
        {isSelf && <span className="ml-2 text-xs text-gray-500">(you)</span>}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onToggleRole}
          disabled={isSelf}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            user.role === 'Administrator'
              ? 'bg-violet-600/30 text-violet-300 hover:bg-violet-600/50'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {user.role}
        </button>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onToggleActive}
          disabled={isSelf}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            user.isActive
              ? 'bg-green-600/30 text-green-300 hover:bg-green-600/50'
              : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {user.isActive ? 'Active' : 'Inactive'}
        </button>
      </td>
      <td className="px-4 py-3 text-gray-400 text-xs">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          disabled={isSelf}
          className="text-gray-600 hover:text-red-400 disabled:opacity-0 transition-colors text-xs"
        >
          Delete
        </button>
      </td>
    </tr>
  )
}
