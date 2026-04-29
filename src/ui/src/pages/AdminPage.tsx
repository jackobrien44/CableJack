import { useState, useMemo, type FormEvent } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { UserStatDto } from '../types/api'
import { adminApi, type UpdateUserRequest, type CreateUserRequest } from '../api/admin'
import { channelsApi } from '../api/channels'
import { categoriesApi } from '../api/categories'
import { epgApi } from '../api/epg'
import { providersApi, type CreateProviderRequest } from '../api/providers'
import { useAuth } from '../hooks/useAuth'
import type { ImportResult, ProviderResponse, SystemSettingsDto, UserResponse } from '../types/api'

type Tab = 'dashboard' | 'imports' | 'providers' | 'users' | 'settings'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="flex flex-col h-full overflow-hidden px-6">
      <div className="shrink-0 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-white mb-4">Admin</h1>
        <div className="flex flex-wrap gap-1 bg-gray-800 rounded-lg p-1 w-fit">
          {(['dashboard', 'imports', 'providers', 'users', 'settings'] as Tab[]).map(t => (
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
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-6">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'imports' && <ImportsTab />}
        {tab === 'providers' && <ProvidersTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings(),
  })

  const [registrationMode, setRegistrationMode] = useState<SystemSettingsDto['registrationMode'] | null>(null)
  const [maxConcurrentStreams, setMaxConcurrentStreams] = useState<number | null>(null)

  const currentMode = registrationMode ?? settings?.registrationMode ?? 'Open'
  const currentMax = maxConcurrentStreams ?? settings?.maxConcurrentStreams ?? 2

  const update = useMutation({
    mutationFn: (body: SystemSettingsDto) => adminApi.updateSettings(body),
    onSuccess: (data) => {
      queryClient.setQueryData(['admin-settings'], data)
      setRegistrationMode(null)
      setMaxConcurrentStreams(null)
      toast.success('Settings saved.')
    },
  })

  if (isLoading) return <div className="text-gray-400 text-sm">Loading…</div>

  const dirty =
    (registrationMode !== null && registrationMode !== settings?.registrationMode) ||
    (maxConcurrentStreams !== null && maxConcurrentStreams !== settings?.maxConcurrentStreams)

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
      </div>

      <div className="bg-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-medium">Streaming</h2>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max concurrent streams per user</label>
          <input
            type="number"
            min={1}
            max={20}
            value={currentMax}
            onChange={e => setMaxConcurrentStreams(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-32"
          />
          <p className="text-gray-500 text-xs mt-1">How many streams a single user can run at the same time.</p>
        </div>
      </div>

      {update.error && <p className="text-red-400 text-sm">{update.error.message}</p>}
      <button
        onClick={() => update.mutate({ registrationMode: currentMode, maxConcurrentStreams: currentMax })}
        disabled={!dirty || update.isPending}
        className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
      >
        {update.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

// ── Dashboard tab ─────────────────────────────────────────────────────────────

function fmtRelative(iso: string | null, now: number): string {
  if (!iso) return '—'
  const diff = now - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function DashboardTab() {
  const queryClient = useQueryClient()
  const INTERVAL = 10_000

  const { data: stats } = useQuery({ queryKey: ['admin-dashboard-stats'], queryFn: adminApi.getDashboardStats, refetchInterval: INTERVAL })
  const { data: streamsData } = useQuery({ queryKey: ['admin-streams'], queryFn: () => adminApi.getActiveStreams(), refetchInterval: INTERVAL })
  const { data: recentHistory, dataUpdatedAt: historyUpdatedAt } = useQuery({ queryKey: ['admin-recent-history'], queryFn: adminApi.getDashboardRecentHistory, refetchInterval: INTERVAL })
  const { data: topChannels } = useQuery({ queryKey: ['admin-top-channels'], queryFn: adminApi.getDashboardTopChannels, refetchInterval: INTERVAL })
  const { data: userStats, dataUpdatedAt: userStatsUpdatedAt } = useQuery({ queryKey: ['admin-user-stats'], queryFn: adminApi.getDashboardUserStats, refetchInterval: INTERVAL })

  const stopStream = useMutation({
    mutationFn: (id: number) => adminApi.adminStopStream(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-streams'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
      toast.success('Stream stopped.')
    },
  })

  const activityData = useMemo(() => {
    const now = historyUpdatedAt
    const buckets = Array.from({ length: 24 }, (_, i) => ({
      label: new Date(now - (23 - i) * 3_600_000).getHours().toString().padStart(2, '0') + ':00',
      sessions: 0,
    }))
    recentHistory?.forEach(h => {
      const msSince = now - new Date(h.startedAt).getTime()
      if (msSince >= 0 && msSince < 24 * 3_600_000) {
        const idx = 23 - Math.floor(msSince / 3_600_000)
        if (idx >= 0 && idx < 24) buckets[idx].sessions++
      }
    })
    return buckets
  }, [recentHistory, historyUpdatedAt])

  const activeStreams = (streamsData?.items ?? []).filter(s => s.status === 'Running' || s.status === 'Starting')

  const statusColor = (s: string) => {
    if (s === 'Running') return 'text-green-400'
    if (s === 'Starting') return 'text-yellow-400'
    if (s === 'Error') return 'text-red-400'
    return 'text-gray-400'
  }

  const fmtDuration = (startedAt: string, stoppedAt: string | null) => {
    const ms = (stoppedAt ? new Date(stoppedAt) : new Date()).getTime() - new Date(startedAt).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const fmtMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : '—'

  const statCards = [
    { label: 'Active Streams', value: stats?.activeStreams ?? '—', color: 'text-white' },
    { label: 'Total Users', value: stats?.totalUsers ?? '—', color: 'text-white' },
    { label: 'Active Channels', value: stats?.totalChannels ?? '—', color: 'text-white' },
    { label: 'Sessions (24h)', value: stats?.streamsLast24h ?? '—', color: 'text-white' },
    { label: 'Errors (24h)', value: stats?.errorsLast24h ?? '—', color: (stats?.errorsLast24h ?? 0) > 0 ? 'text-red-400' : 'text-white' },
    { label: 'New Users (7d)', value: stats?.newUsersLast7d ?? '—', color: 'text-white' },
  ]

  return (
    <div className="space-y-6">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1 leading-tight">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Activity chart — full width */}
        <div className="lg:col-span-2">
          <Section title="Activity (24h)" hint="based on last 30 sessions">
            <div className="px-2 pt-2 pb-4">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={activityData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const v = payload[0].value as number
                      return (
                        <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                          <p style={{ color: '#9ca3af', marginBottom: 2 }}>{label}</p>
                          <p style={{ color: '#a78bfa' }}>{v} session{v !== 1 ? 's' : ''}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="sessions" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* Active streams — full width */}
        <div className="lg:col-span-2">
          <Section title="Active Streams" badge={activeStreams.length} hint="auto-refreshes every 10s">
            {activeStreams.length === 0
              ? <Empty>No active streams.</Empty>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-700">
                      <Th>User</Th><Th>Channel</Th><Th>Status</Th><Th>Duration</Th><Th />
                    </tr></thead>
                    <tbody className="divide-y divide-gray-700">
                      {activeStreams.map(s => (
                        <tr key={s.id} className="hover:bg-gray-750">
                          <Td><span className="text-white font-medium">{s.username ?? `User ${s.userId}`}</span></Td>
                          <Td>{s.channelName}</Td>
                          <Td><span className={`font-medium ${statusColor(s.status)}`}>{s.status}</span></Td>
                          <Td>{fmtDuration(s.startedAt, null)}</Td>
                          <Td right>
                            <button
                              onClick={() => { if (confirm(`Kill ${s.username ?? 'this user'}'s stream of ${s.channelName}?`)) stopStream.mutate(s.id) }}
                              disabled={stopStream.isPending && stopStream.variables === s.id}
                              className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs transition-colors"
                            >Kill</button>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </Section>
        </div>

        {/* Top channels */}
        <Section title="Top Channels" hint="all time">
          {!topChannels?.length
            ? <Empty>No watch history yet.</Empty>
            : (
              <div className="px-2 pt-2 pb-4">
                <ResponsiveContainer width="100%" height={Math.max(160, topChannels.length * 34 + 24)}>
                  <BarChart
                    layout="vertical"
                    data={topChannels}
                    margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="channelName"
                      width={110}
                      tick={{ fontSize: 11, fill: '#d1d5db' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 14) + '…' : v}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0].payload
                        return (
                          <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
                            <p style={{ color: '#e5e7eb', marginBottom: 4 }}>{d.channelName}</p>
                            <p style={{ color: '#a78bfa' }}>{d.sessionCount} session{d.sessionCount !== 1 ? 's' : ''}</p>
                            <p style={{ color: '#9ca3af' }}>{fmtMinutes(d.totalMinutes)}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="sessionCount" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
        </Section>

        {/* Recent watch history */}
        <Section title="Recent Sessions" hint="last 30">
          {!recentHistory?.length
            ? <Empty>No watch history yet.</Empty>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-700">
                    <Th>User</Th><Th>Channel</Th><Th right>Duration</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-700">
                    {recentHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-gray-750">
                        <Td><span className="text-white">{h.username}</span></Td>
                        <Td>{h.channelName}</Td>
                        <Td right>{fmtDuration(h.startedAt, h.stoppedAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </Section>
      </div>

      {/* User stats */}
      <Section title="Users">
        {!userStats?.length
          ? <Empty>No users.</Empty>
          : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700">
                <Th>Username</Th><Th right>Active</Th><Th right>Sessions</Th><Th right>Watch time</Th><Th right>Last login</Th><Th right>Joined</Th>
              </tr></thead>
              <tbody className="divide-y divide-gray-700">
                {userStats.map((u: UserStatDto) => (
                  <tr key={u.userId} className="hover:bg-gray-750">
                    <Td>
                      <span className={u.isActive ? 'text-white font-medium' : 'text-gray-500 font-medium'}>{u.username}</span>
                      {!u.isActive && <span className="ml-2 text-xs text-red-400">disabled</span>}
                    </Td>
                    <Td right>{u.activeStreams > 0 ? <span className="text-green-400 font-medium">{u.activeStreams}</span> : <span className="text-gray-600">—</span>}</Td>
                    <Td right>{u.totalSessions}</Td>
                    <Td right>{fmtMinutes(u.totalMinutes)}</Td>
                    <Td right>{fmtRelative(u.lastLoginAt, userStatsUpdatedAt)}</Td>
                    <Td right>{fmtDate(u.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
      </Section>
    </div>
  )
}

function Section({ title, badge, hint, children }: { title: string; badge?: number; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-white font-medium">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className="bg-violet-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">{badge}</span>
          )}
        </div>
        {hint && <span className="text-gray-500 text-xs">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={`px-5 py-3 text-gray-400 font-medium text-xs ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}

function Td({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <td className={`px-5 py-3 text-gray-300 ${right ? 'text-right' : ''}`}>{children}</td>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-500 text-sm px-5 py-4">{children}</p>
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
                  className="text-xs border border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white px-2 py-0.5 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete provider "${p.name}"? Channels will keep their data but lose the provider link.`))
                      deleteProvider.mutate(p.id)
                  }}
                  className="text-xs border border-red-900 text-red-500 hover:bg-red-600 hover:border-red-600 hover:text-white px-2 py-0.5 rounded transition-colors"
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
      toast.success('User created.')
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
    onSuccess: () => {
      setResetPasswordUserId(null)
      toast.success('Password reset.')
    },
  })

  const deleteUser = useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User deleted.')
    },
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
                className={`text-xs border px-2 py-0.5 rounded transition-colors ${resettingPassword ? 'border-gray-600 text-gray-400 hover:text-white hover:border-gray-400' : 'border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white'}`}
              >
                {resettingPassword ? 'Cancel' : 'Reset Password'}
              </button>
            )}
            <button
              onClick={onDelete}
              disabled={isSelf}
              className="text-xs border border-red-900 text-red-500 hover:bg-red-600 hover:border-red-600 hover:text-white px-2 py-0.5 rounded transition-colors disabled:opacity-0"
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
