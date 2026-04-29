import { useState, type FormEvent } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, type UpdateUserRequest, type CreateUserRequest } from '../api/admin'
import { channelsApi } from '../api/channels'
import { categoriesApi } from '../api/categories'
import { epgApi } from '../api/epg'
import { providersApi, type CreateProviderRequest } from '../api/providers'
import { useAuth } from '../hooks/useAuth'
import type { ImportResult, ProviderResponse, SystemSettingsDto, UserResponse } from '../types/api'

type Tab = 'imports' | 'providers' | 'users' | 'settings'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('imports')

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Admin</h1>

      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {(['imports', 'providers', 'users', 'settings'] as Tab[]).map(t => (
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
      {tab === 'providers' && <ProvidersTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  const [registrationMode, setRegistrationMode] = useState<SystemSettingsDto['registrationMode'] | null>(null)

  const currentMode = registrationMode ?? settings?.registrationMode ?? 'Open'

  const update = useMutation({
    mutationFn: (body: SystemSettingsDto) => adminApi.updateSettings(body),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-settings'], data)
      setRegistrationMode(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Loading…</div>

  const dirty = registrationMode !== null && registrationMode !== settings?.registrationMode

  return (
    <div className="max-w-md space-y-6">
      <div className="bg-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-medium">Registration</h2>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Registration mode</label>
          <select
            value={currentMode}
            onChange={e => setRegistrationMode(e.target.value as SystemSettingsDto['registrationMode'])}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full"
          >
            <option value="Open">Open — anyone can register</option>
            <option value="InviteOnly">Invite only</option>
            <option value="Disabled">Disabled — no new registrations</option>
          </select>
        </div>
        {update.error && <p className="text-red-400 text-sm">{update.error.message}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={() => update.mutate({ registrationMode: currentMode })}
            disabled={!dirty || update.isPending}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-green-400 text-sm">Saved</span>}
        </div>
      </div>
    </div>
  )
}

// ── Imports tab ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function ImportsTab() {
  const queryClient = useQueryClient()
  const [m3uResult, setM3uResult] = useState<ImportResult | null>(null)
  const [epgResult, setEpgResult] = useState<ImportResult | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.getAll(),
  })

  const clearChannels = useMutation({
    mutationFn: () => channelsApi.deleteAll(),
    onSuccess: ({ deleted }) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      alert(`Deleted ${deleted} channel${deleted !== 1 ? 's' : ''}.`)
    },
  })

  const clearCategories = useMutation({
    mutationFn: () => categoriesApi.deleteAll(),
    onSuccess: ({ deleted }) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      alert(`Deleted ${deleted} categor${deleted !== 1 ? 'ies' : 'y'}.`)
    },
  })

  const clearEpg = useMutation({
    mutationFn: () => epgApi.deleteAll(),
    onSuccess: ({ deleted }) => alert(`Deleted ${deleted} programme${deleted !== 1 ? 's' : ''}.`),
  })

  const importM3UFile = useMutation({
    mutationFn: async ({ file, providerId }: { file: File; providerId: number | null }) => {
      const form = new FormData()
      form.append('file', file)
      const url = providerId ? `/api/admin/channels/import?providerId=${providerId}` : '/api/admin/channels/import'
      const res = await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ImportResult>
    },
    onSuccess: setM3uResult,
  })

  const importM3UUrl = useMutation({
    mutationFn: async ({ url, providerId }: { url: string; providerId: number | null }) => {
      const res = await fetch('/api/admin/channels/import-url', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, providerId }),
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
      const res = await fetch('/api/epg/import', {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json() as Promise<ImportResult>
    },
    onSuccess: setEpgResult,
  })

  const m3uLoading = importM3UFile.isPending || importM3UUrl.isPending
  const m3uError = importM3UFile.error?.message ?? importM3UUrl.error?.message

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-3">Provider</h2>
        <select
          value={selectedProviderId ?? ''}
          onChange={e => setSelectedProviderId(e.target.value ? Number(e.target.value) : null)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full max-w-xs"
        >
          <option value="">No provider</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {providers.length === 0 && (
          <p className="text-gray-500 text-xs mt-2">No providers yet — add one in the Providers tab.</p>
        )}
      </div>

      <ImportCard
        title="Import M3U Playlist"
        accept=".m3u,.m3u8"
        loading={m3uLoading}
        result={m3uResult}
        error={m3uError}
        onFile={f => importM3UFile.mutate({ file: f, providerId: selectedProviderId })}
        onUrl={url => importM3UUrl.mutate({ url, providerId: selectedProviderId })}
      />
      <ImportCard
        title="Import EPG (XMLTV)"
        accept=".xml,.xmltv"
        loading={importEPG.isPending}
        result={epgResult}
        error={importEPG.error?.message}
        onFile={f => importEPG.mutate(f)}
      />
      <div className="bg-gray-800 rounded-xl p-5">
        <h2 className="text-white font-medium mb-3">Cleanup</h2>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (confirm('Delete all channels? This cannot be undone.')) clearChannels.mutate()
            }}
            disabled={clearChannels.isPending}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {clearChannels.isPending ? 'Deleting…' : 'Clear All Channels'}
          </button>
          <button
            onClick={() => {
              if (confirm('Delete all categories? This cannot be undone.')) clearCategories.mutate()
            }}
            disabled={clearCategories.isPending}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {clearCategories.isPending ? 'Deleting…' : 'Clear All Categories'}
          </button>
          <button
            onClick={() => {
              if (confirm('Delete all EPG data? This cannot be undone.')) clearEpg.mutate()
            }}
            disabled={clearEpg.isPending}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            {clearEpg.isPending ? 'Deleting…' : 'Clear EPG'}
          </button>
        </div>
        {clearChannels.error && (
          <p className="text-red-400 text-sm mt-3">{clearChannels.error.message}</p>
        )}
        {clearCategories.error && (
          <p className="text-red-400 text-sm mt-3">{clearCategories.error.message}</p>
        )}
      </div>
    </div>
  )
}

interface ImportCardProps {
  title: string
  accept: string
  loading: boolean
  result: ImportResult | null
  error?: string
  onFile: (f: File) => void
  onUrl?: (url: string) => void
}

function ImportCard({ title, accept, loading, result, error, onFile, onUrl }: ImportCardProps) {
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [url, setUrl] = useState('')

  function handleUrlSubmit(e: FormEvent) {
    e.preventDefault()
    if (url.trim()) onUrl?.(url.trim())
  }

  return (
    <div className="bg-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-medium">{title}</h2>
        {onUrl && (
          <div className="flex gap-1 bg-gray-700 rounded-md p-0.5">
            {(['file', 'url'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                  mode === m ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'file' ? (
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
      ) : (
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com/playlist.m3u"
            required
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
        </form>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {result && (
        <div className="mt-3 text-sm space-y-1">
          <p className="text-green-400">Import complete</p>
          <p className="text-gray-400">
            Channels created: {result.channelsCreated} · updated: {result.channelsUpdated}{result.channelsSkipped > 0 && ` · skipped: ${result.channelsSkipped}`} · categories: {result.categoriesCreated}
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

// ── Providers tab ─────────────────────────────────────────────────────────────

function ProvidersTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProviderResponse | null>(null)
  const [importResults, setImportResults] = useState<Record<string, ImportResult>>({})

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: () => providersApi.getAll(),
  })

  const createProvider = useMutation({
    mutationFn: (req: CreateProviderRequest) => providersApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setShowForm(false)
    },
  })

  const updateProvider = useMutation({
    mutationFn: ({ id, req }: { id: number; req: CreateProviderRequest }) => providersApi.update(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] })
      setEditing(null)
    },
  })

  const deleteProvider = useMutation({
    mutationFn: (id: number) => providersApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers'] }),
  })

  const importProvider = useMutation({
    mutationFn: (id: number) => providersApi.import(id),
    onSuccess: (result, id) => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setImportResults(prev => ({ ...prev, [id]: result }))
    },
  })

  const importEpg = useMutation({
    mutationFn: (id: number) => providersApi.importEpg(id),
    onSuccess: (result, id) => {
      setImportResults(prev => ({ ...prev, [`epg-${id}`]: result }))
    },
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Loading…</div>

  return (
    <div className="max-w-2xl space-y-4">
      {providers.length === 0 && !showForm && (
        <p className="text-gray-400 text-sm">No providers yet.</p>
      )}

      {providers.map(p => (
        editing?.id === p.id ? (
          <ProviderForm
            key={p.id}
            initial={p}
            loading={updateProvider.isPending}
            error={updateProvider.error?.message}
            onSubmit={req => updateProvider.mutate({ id: p.id, req })}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={p.id} className="bg-gray-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-white font-medium">{p.name}</p>
                {p.baseUrl && <p className="text-gray-400 text-xs truncate">{p.baseUrl}</p>}
                {p.username && <p className="text-gray-500 text-xs">User: {p.username}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {p.baseUrl && p.username && p.password && (
                  <>
                    <button
                      onClick={() => importProvider.mutate(p.id)}
                      disabled={importProvider.isPending && importProvider.variables === p.id}
                      className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {importProvider.isPending && importProvider.variables === p.id ? 'Importing…' : 'Import'}
                    </button>
                    <button
                      onClick={() => importEpg.mutate(p.id)}
                      disabled={importEpg.isPending && importEpg.variables === p.id}
                      className="bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {importEpg.isPending && importEpg.variables === p.id ? 'Importing EPG…' : 'Import EPG'}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setEditing(p)}
                  className="text-gray-400 hover:text-white text-xs transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete provider "${p.name}"? Channels will keep their data but lose the provider link.`))
                      deleteProvider.mutate(p.id)
                  }}
                  className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
            {importProvider.isError && importProvider.variables === p.id && (
              <p className="text-red-400 text-xs mt-2">{importProvider.error?.message}</p>
            )}
            {importEpg.isError && importEpg.variables === p.id && (
              <p className="text-red-400 text-xs mt-2">{importEpg.error?.message}</p>
            )}
            {importResults[p.id] && (() => {
              const r = importResults[p.id]
              return (
                <p className="text-gray-400 text-xs mt-2">
                  Channels: <span className="text-green-400">{r.channelsCreated} added</span>
                  {r.channelsSkipped > 0 && <span> · {r.channelsSkipped} skipped</span>}
                  {r.categoriesCreated > 0 && <span> · {r.categoriesCreated} new categories</span>}
                </p>
              )
            })()}
            {importResults[`epg-${p.id}`] && (() => {
              const r = importResults[`epg-${p.id}`]
              return (
                <p className="text-gray-400 text-xs mt-1">
                  EPG: <span className="text-green-400">{r.channelsCreated + r.channelsUpdated} programmes imported</span>
                </p>
              )
            })()}
          </div>
        )
      ))}

      {showForm ? (
        <ProviderForm
          loading={createProvider.isPending}
          error={createProvider.error?.message}
          onSubmit={req => createProvider.mutate(req)}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Add Provider
        </button>
      )}
    </div>
  )
}

interface ProviderFormProps {
  initial?: ProviderResponse
  loading: boolean
  error?: string
  onSubmit: (req: CreateProviderRequest) => void
  onCancel: () => void
}

function ProviderForm({ initial, loading, error, onSubmit, onCancel }: ProviderFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({
      name,
      baseUrl: baseUrl || undefined,
      username: username || undefined,
      password: password || undefined,
    })
  }

  const inputCls = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full'

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-white font-medium">{initial ? 'Edit Provider' : 'New Provider'}</h2>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} required placeholder="My IPTV Provider" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Base URL</label>
        <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://server:8080" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" className={inputCls} />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['admin-users'],
    queryFn: ({ pageParam = 1 }) => adminApi.getUsers(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasNextPage ? last.page + 1 : undefined,
  })

  const createUser = useMutation({
    mutationFn: (body: CreateUserRequest) => adminApi.createUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreateForm(false)
    },
  })

  const updateUser = useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: UpdateUserRequest }) =>
      adminApi.updateUser(userId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const resetPassword = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: number; newPassword: string }) =>
      adminApi.resetPassword(userId, newPassword),
    onSuccess: () => setResetPasswordUserId(null),
  })

  const deleteUser = useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const users = data?.pages.flatMap(p => p.items) ?? []

  if (isLoading) return <div className="text-gray-400 text-sm">Loading users…</div>

  return (
    <div className="max-w-3xl space-y-4">
      {showCreateForm ? (
        <CreateUserForm
          loading={createUser.isPending}
          error={createUser.error?.message}
          onSubmit={body => createUser.mutate(body)}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Create User
        </button>
      )}

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
                resettingPassword={resetPasswordUserId === user.id}
                resetPasswordError={resetPassword.error?.message}
                resetPasswordPending={resetPassword.isPending && resetPassword.variables?.userId === user.id}
                onToggleRole={() => updateUser.mutate({
                  userId: user.id,
                  body: { role: user.role === 'Administrator' ? 'User' : 'Administrator' },
                })}
                onToggleActive={() => updateUser.mutate({
                  userId: user.id,
                  body: { isActive: !user.isActive },
                })}
                onResetPassword={() => setResetPasswordUserId(user.id)}
                onCancelResetPassword={() => setResetPasswordUserId(null)}
                onConfirmResetPassword={pw => resetPassword.mutate({ userId: user.id, newPassword: pw })}
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
        <div>
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

interface CreateUserFormProps {
  loading: boolean
  error?: string
  onSubmit: (body: CreateUserRequest) => void
  onCancel: () => void
}

function CreateUserForm({ loading, error, onSubmit, onCancel }: CreateUserFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'User' | 'Administrator'>('User')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({ username, password, role })
  }

  const inputCls = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full'

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-white font-medium">New User</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Username *</label>
          <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} placeholder="username" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Password *</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="min 8 chars" className={inputCls} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Role</label>
        <select
          value={role}
          onChange={e => setRole(e.target.value as 'User' | 'Administrator')}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="User">User</option>
          <option value="Administrator">Administrator</option>
        </select>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Creating…' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

interface UserRowProps {
  user: UserResponse
  isSelf: boolean
  resettingPassword: boolean
  resetPasswordError?: string
  resetPasswordPending: boolean
  onToggleRole: () => void
  onToggleActive: () => void
  onResetPassword: () => void
  onCancelResetPassword: () => void
  onConfirmResetPassword: (pw: string) => void
  onDelete: () => void
}

function UserRow({
  user, isSelf, resettingPassword, resetPasswordError, resetPasswordPending,
  onToggleRole, onToggleActive, onResetPassword, onCancelResetPassword, onConfirmResetPassword, onDelete,
}: UserRowProps) {
  const [newPassword, setNewPassword] = useState('')

  function handleResetSubmit(e: FormEvent) {
    e.preventDefault()
    onConfirmResetPassword(newPassword)
    setNewPassword('')
  }

  return (
    <>
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
          <div className="flex items-center justify-end gap-3">
            {!isSelf && (
              <button
                onClick={resettingPassword ? onCancelResetPassword : onResetPassword}
                className={`text-xs transition-colors ${resettingPassword ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {resettingPassword ? 'Cancel' : 'Reset pw'}
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={isSelf}
              className="text-gray-600 hover:text-red-400 disabled:opacity-0 transition-colors text-xs"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
      {resettingPassword && (
        <tr className="bg-gray-800/50">
          <td colSpan={5} className="px-4 py-3">
            <form onSubmit={handleResetSubmit} className="flex items-center gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="New password (min 8 chars)"
                autoFocus
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-64"
              />
              <button
                type="submit"
                disabled={resetPasswordPending}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                {resetPasswordPending ? 'Saving…' : 'Set password'}
              </button>
              {resetPasswordError && <span className="text-red-400 text-xs">{resetPasswordError}</span>}
            </form>
          </td>
        </tr>
      )}
    </>
  )
}
