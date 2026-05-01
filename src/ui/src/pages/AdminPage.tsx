import { useState, useMemo, useRef, useEffect, type FormEvent } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { UserStatDto } from '../types/api'
import { adminApi, type UpdateUserRequest, type CreateUserRequest } from '../api/admin'
import { channelsApi, type CreateChannelRequest, type UpdateChannelRequest } from '../api/channels'
import { categoriesApi, type CreateCategoryRequest } from '../api/categories'
import { epgApi } from '../api/epg'
import { providersApi, type CreateProviderRequest } from '../api/providers'
import { useAuth } from '../hooks/useAuth'
import type { AuditLogDto, ChannelResponse, ImportResult, ProviderResponse, SystemSettingsDto, UserResponse } from '../types/api'

type Tab = 'dashboard' | 'imports' | 'providers' | 'categories' | 'channels' | 'users' | 'history' | 'audit' | 'settings'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="flex flex-col h-full overflow-hidden px-6">
      <div className="shrink-0 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-white mb-4">Admin</h1>
        {/* Mobile: native select */}
        <div className="relative sm:hidden">
          <select
            value={tab}
            onChange={e => setTab(e.target.value as Tab)}
            className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm text-white capitalize focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {(['dashboard', 'imports', 'providers', 'categories', 'channels', 'users', 'history', 'audit', 'settings'] as Tab[]).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 8L1 3h10L6 8z"/>
          </svg>
        </div>

        {/* Desktop: pill tabs */}
        <div className="hidden sm:flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
          {(['dashboard', 'imports', 'providers', 'categories', 'channels', 'users', 'history', 'audit', 'settings'] as Tab[]).map(t => (
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

      <div className={`flex-1 min-h-0 ${tab === 'categories' || tab === 'channels' ? 'overflow-y-auto md:overflow-hidden' : 'overflow-y-auto pb-6'}`}>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'imports' && <ImportsTab />}
        {tab === 'providers' && <ProvidersTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'channels' && <ChannelsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

// ── Categories tab ────────────────────────────────────────────────────────────

function CategoriesTab() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<{ id: number; name: string; sortOrder: number } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })
  const categories = [...(data?.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)

  const create = useMutation({
    mutationFn: (req: CreateCategoryRequest) => categoriesApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setShowForm(false)
      toast.success('Category created.')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, name, sortOrder }: { id: number; name: string; sortOrder: number }) =>
      categoriesApi.update(id, { name, sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setEditing(null)
    },
  })

  const del = useMutation({
    mutationFn: (id: number) => categoriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted.')
    },
  })

  function move(index: number, direction: -1 | 1) {
    const a = categories[index]
    const b = categories[index + direction]
    if (!a || !b) return
    Promise.all([
      categoriesApi.update(a.id, { sortOrder: b.sortOrder }),
      categoriesApi.update(b.id, { sortOrder: a.sortOrder }),
    ]).then(() => queryClient.invalidateQueries({ queryKey: ['categories'] }))
  }

  if (isLoading) return <div className="text-gray-400 text-sm">Loading…</div>

  return (
    <div className="max-w-lg flex flex-col gap-4 pb-3 md:h-full md:overflow-hidden">
      <div className="shrink-0">
        {showForm ? (
          <CategoryForm
            loading={create.isPending}
            error={create.error?.message}
            onSubmit={req => create.mutate(req)}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Add Category
          </button>
        )}
      </div>

      {categories.length === 0 && !showForm && (
        <p className="text-gray-400 text-sm">No categories yet.</p>
      )}

      {categories.length > 0 && (
        <div className="overflow-y-auto bg-gray-800 rounded-xl md:flex-1 md:min-h-0">
          <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr className="border-b border-gray-700">
                  <Th>Name</Th>
                  <Th>Order</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {categories.map((cat, i) =>
                  editing?.id === cat.id ? (
                    <CategoryEditRow
                      key={cat.id}
                      initial={editing}
                      loading={update.isPending}
                      error={update.error?.message}
                      onSave={(name, sortOrder) => update.mutate({ id: cat.id, name, sortOrder })}
                      onCancel={() => setEditing(null)}
                    />
                  ) : (
                    <tr key={cat.id} className="hover:bg-gray-750">
                      <Td><span className="text-white font-medium">{cat.name}</span></Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            className="text-gray-500 hover:text-white disabled:opacity-20 text-base leading-none px-0.5 transition-colors"
                            title="Move up"
                          >↑</button>
                          <button
                            onClick={() => move(i, 1)}
                            disabled={i === categories.length - 1}
                            className="text-gray-500 hover:text-white disabled:opacity-20 text-base leading-none px-0.5 transition-colors"
                            title="Move down"
                          >↓</button>
                          <span className="text-gray-500 text-xs ml-1">{cat.sortOrder}</span>
                        </div>
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setEditing({ id: cat.id, name: cat.name, sortOrder: cat.sortOrder })}
                            className="text-xs border border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white px-2 py-0.5 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete category "${cat.name}"? Channels in this category will lose their category.`))
                                del.mutate(cat.id)
                            }}
                            disabled={del.isPending && del.variables === cat.id}
                            className="text-xs border border-red-900 text-red-500 hover:bg-red-600 hover:border-red-600 hover:text-white px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  )
                )}
              </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CategoryForm({ loading, error, onSubmit, onCancel }: {
  loading: boolean
  error?: string
  onSubmit: (req: CreateCategoryRequest) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const inputCls = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit({ name, sortOrder })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-white font-medium">New Category</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-400 mb-1">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Category name" className={inputCls} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs text-gray-400 mb-1">Sort order</label>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className={inputCls} />
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
      </div>
    </form>
  )
}

function CategoryEditRow({ initial, loading, error, onSave, onCancel }: {
  initial: { name: string; sortOrder: number }
  loading: boolean
  error?: string
  onSave: (name: string, sortOrder: number) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [sortOrder, setSortOrder] = useState(initial.sortOrder)
  const inputCls = 'bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500'

  return (
    <tr className="bg-gray-750">
      <td className="px-5 py-2">
        <input value={name} onChange={e => setName(e.target.value)} className={inputCls + ' w-full'} autoFocus />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </td>
      <td className="px-5 py-2">
        <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className={inputCls + ' w-20'} />
      </td>
      <td className="px-5 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => onSave(name, sortOrder)} disabled={loading} className="text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-2 py-1 rounded transition-colors">
            {loading ? '…' : 'Save'}
          </button>
          <button onClick={onCancel} className="text-xs border border-gray-700 text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">Cancel</button>
        </div>
      </td>
    </tr>
  )
}

// ── Channels tab ──────────────────────────────────────────────────────────────

const CHANNEL_PAGE_SIZE = 25

function ChannelsTab() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
  const [editingChannel, setEditingChannel] = useState<ChannelResponse | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['channels', search, categoryFilter, page, CHANNEL_PAGE_SIZE],
    queryFn: () => channelsApi.getAll({ page, pageSize: CHANNEL_PAGE_SIZE, search: search || undefined, categoryId: categoryFilter }),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })
  const categories = categoriesData?.items ?? []

  const create = useMutation({
    mutationFn: (req: CreateChannelRequest) => channelsApi.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setShowCreateForm(false)
      toast.success('Channel created.')
    },
  })

  const update = useMutation({
    mutationFn: ({ id, req }: { id: number; req: UpdateChannelRequest }) => channelsApi.update(id, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setEditingChannel(null)
      toast.success('Channel updated.')
    },
  })

  const del = useMutation({
    mutationFn: (id: number) => channelsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success('Channel deleted.')
    },
  })

  function handleSearchChange(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1) }, 300)
  }

  const channels = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="flex flex-col gap-4 pb-3 md:h-full md:overflow-hidden">
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          {categories.length > 0 && (
            <div className="relative">
              <select
                value={categoryFilter ?? ''}
                onChange={e => { setCategoryFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
                className="w-full sm:w-auto appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M6 8L1 3h10L6 8z"/>
              </svg>
            </div>
          )}
          <input
            type="search"
            placeholder="Search channels…"
            value={inputValue}
            onChange={e => handleSearchChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-56"
          />
          <button
            onClick={() => { setEditingChannel(null); setShowCreateForm(v => !v) }}
            className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            {showCreateForm ? 'Cancel' : 'Add Channel'}
          </button>
        </div>

        {showCreateForm && (
          <ChannelForm
            categories={categories}
            loading={create.isPending}
            error={create.error?.message}
            onSubmit={req => create.mutate(req)}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {editingChannel && (
          <ChannelForm
            initial={editingChannel}
            categories={categories}
            loading={update.isPending}
            error={update.error?.message}
            onSubmit={req => update.mutate({ id: editingChannel.id, req })}
            onCancel={() => setEditingChannel(null)}
          />
        )}
      </div>

      <div className="md:flex-1 md:min-h-0 md:overflow-hidden">
        {isLoading
          ? <div className="text-gray-400 text-sm">Loading…</div>
          : channels.length === 0
          ? <div className="text-gray-500 text-sm">No channels found.</div>
          : (
          <div className="bg-gray-800 rounded-xl overflow-auto md:overflow-hidden md:h-full">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800 z-10">
                  <tr className="border-b border-gray-700">
                    <Th>Name</Th>
                    <Th>Category</Th>
                    <Th>Active</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {channels.map(ch => (
                    <tr key={ch.id} className="hover:bg-gray-750">
                      <Td>
                        <span className="text-white font-medium">{ch.name}</span>
                        {ch.providerName && <span className="ml-2 text-xs text-gray-500">{ch.providerName}</span>}
                      </Td>
                      <Td><span className="text-gray-300">{ch.categoryName}</span></Td>
                      <Td>
                        <button
                          onClick={() => update.mutate({ id: ch.id, req: { isActive: !ch.isActive } })}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            ch.isActive ? 'bg-green-600/30 text-green-300 hover:bg-green-600/50' : 'bg-red-600/30 text-red-300 hover:bg-red-600/50'
                          }`}
                        >
                          {ch.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </Td>
                      <Td right>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => { setShowCreateForm(false); setEditingChannel(editingChannel?.id === ch.id ? null : ch) }}
                            className="text-xs border border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white px-2 py-0.5 rounded transition-colors"
                          >
                            {editingChannel?.id === ch.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete channel "${ch.name}"?`)) del.mutate(ch.id)
                            }}
                            disabled={del.isPending && del.variables === ch.id}
                            className="text-xs border border-red-900 text-red-500 hover:bg-red-600 hover:border-red-600 hover:text-white px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-0.5 sm:gap-1">
          <HPageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</HPageButton>
          {hPageNumbers(page, totalPages).map((p, i) =>
            p === '…'
              ? <span key={`e-${i}`} className="px-2 text-gray-600">…</span>
              : <HPageButton key={p} onClick={() => setPage(p as number)} active={p === page}>{p}</HPageButton>
          )}
          <HPageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</HPageButton>
        </div>
      )}
    </div>
  )
}

function ChannelForm({ initial, categories, loading, error, onSubmit, onCancel }: {
  initial?: ChannelResponse
  categories: { id: number; name: string }[]
  loading: boolean
  error?: string
  onSubmit: (req: CreateChannelRequest) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? '')
  const [categoryId, setCategoryId] = useState<number | ''>(initial?.categoryId ?? (categories[0]?.id ?? ''))
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [tvgId, setTvgId] = useState(initial?.tvgId ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? 0)

  const inputCls = 'bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full'

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!categoryId) return
    onSubmit({ name, sourceUrl, categoryId: Number(categoryId), logoUrl: logoUrl || undefined, description: description || undefined, tvgId: tvgId || undefined, isActive, sortOrder })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-white font-medium">{initial ? 'Edit Channel' : 'New Channel'}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Channel name" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Source URL *</label>
          <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} required placeholder="http://…/stream.m3u8" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Category *</label>
          <select value={categoryId} onChange={e => setCategoryId(Number(e.target.value))} required className={inputCls}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">TVG ID</label>
          <input value={tvgId} onChange={e => setTvgId(e.target.value)} placeholder="channel.tvg.id" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Logo URL</label>
          <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description" className={inputCls + ' resize-none'} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sort order</label>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className={inputCls} />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input id="ch-active" type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="accent-violet-500 w-4 h-4" />
          <label htmlFor="ch-active" className="text-sm text-gray-300 cursor-pointer">Active</label>
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          {loading ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors">Cancel</button>
      </div>
    </form>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const PAGE_SIZE = 50

  const { data: userStats } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: adminApi.getDashboardUserStats,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-history', page, userId, search],
    queryFn: () => adminApi.getAdminHistory(page, PAGE_SIZE, userId, search || undefined),
  })

  const { data: recentHistory } = useQuery({
    queryKey: ['admin-recent-history'],
    queryFn: adminApi.getDashboardRecentHistory,
  })

  const { data: topChannels } = useQuery({
    queryKey: ['admin-top-channels'],
    queryFn: adminApi.getDashboardTopChannels,
  })

  function handleSearchChange(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  function handleUserChange(id: number | undefined) {
    setUserId(id)
    setPage(1)
  }

  const entries = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  const fmtDuration = (start: string, end: string | null) => {
    if (!end) return '—'
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 1) return '< 1 min'
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const fmtMinutes = (mins: number) => mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top channels */}
        <Section title="Top Channels" hint="all time">
          {!topChannels?.length
            ? <Empty>No watch history yet.</Empty>
            : (
              <div className="overflow-y-auto max-h-72 px-2 pt-2 pb-4">
                <ResponsiveContainer width="100%" height={Math.max(160, topChannels.length * 34 + 24)}>
                  <BarChart layout="vertical" data={topChannels} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="channelName" width={110} tick={{ fontSize: 11, fill: '#d1d5db' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 14) + '…' : v} />
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

        {/* Recent sessions */}
        <Section title="Recent Sessions" hint="last 30">
          {!recentHistory?.length
            ? <Empty>No watch history yet.</Empty>
            : (
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr className="border-b border-gray-700">
                      <Th>User</Th><Th>Channel</Th><Th right>Duration</Th>
                    </tr>
                  </thead>
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
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={userId ?? ''}
          onChange={e => handleUserChange(e.target.value ? Number(e.target.value) : undefined)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All users</option>
          {(userStats ?? []).map(u => (
            <option key={u.userId} value={u.userId}>{u.username}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Filter by channel…"
          value={inputValue}
          onChange={e => handleSearchChange(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-56"
        />
      </div>

      <Section title="Watch History" hint={data ? `${data.totalCount.toLocaleString()} sessions` : undefined}>
        {isLoading
          ? <Empty>Loading…</Empty>
          : entries.length === 0
          ? <Empty>No sessions found.</Empty>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-700">
                  <Th>User</Th><Th>Channel</Th><Th>Date</Th><Th right>Duration</Th>
                </tr></thead>
                <tbody className="divide-y divide-gray-700">
                  {entries.map(h => (
                    <tr key={h.id} className="hover:bg-gray-750">
                      <Td><span className="text-white font-medium">{h.username}</span></Td>
                      <Td>{h.channelName}</Td>
                      <Td>
                        <span className="text-gray-300">{new Date(h.startedAt).toLocaleDateString()}</span>
                        <span className="text-gray-500 ml-2 text-xs">{new Date(h.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </Td>
                      <Td right>{fmtDuration(h.startedAt, h.stoppedAt)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-0.5 sm:gap-1">
          <HPageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</HPageButton>
          {hPageNumbers(page, totalPages).map((p, i) =>
            p === '…'
              ? <span key={`e-${i}`} className="px-2 text-gray-600">…</span>
              : <HPageButton key={p} onClick={() => setPage(p as number)} active={p === page}>{p}</HPageButton>
          )}
          <HPageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</HPageButton>
        </div>
      )}
    </div>
  )
}

function HPageButton({ onClick, disabled, active, children }: { onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[2.5rem] h-10 px-1 sm:min-w-[2.25rem] sm:h-9 sm:px-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 ${
        active ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function hPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
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
  const [showErrors, setShowErrors] = useState(false)

  const { data: stats } = useQuery({ queryKey: ['admin-dashboard-stats'], queryFn: adminApi.getDashboardStats, refetchInterval: INTERVAL })
  const { data: streamsData } = useQuery({ queryKey: ['admin-streams'], queryFn: () => adminApi.getActiveStreams(), refetchInterval: INTERVAL })
  const { data: recentHistory, dataUpdatedAt: historyUpdatedAt } = useQuery({ queryKey: ['admin-recent-history'], queryFn: adminApi.getDashboardRecentHistory, refetchInterval: INTERVAL })
  const { data: userStats, dataUpdatedAt: userStatsUpdatedAt } = useQuery({ queryKey: ['admin-user-stats'], queryFn: adminApi.getDashboardUserStats, refetchInterval: INTERVAL })
  const { data: errorStreams, dataUpdatedAt: errorsUpdatedAt } = useQuery({ queryKey: ['admin-dashboard-errors'], queryFn: adminApi.getDashboardErrors, enabled: showErrors, refetchInterval: showErrors ? INTERVAL : false })

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

  const fmtMinutes = (mins: number) => mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString() : '—'

  const errorCount = stats?.errorsLast24h ?? 0
  const statCards = [
    { label: 'Active Streams', value: stats?.activeStreams ?? '—', color: 'text-white', onClick: undefined },
    { label: 'Total Users', value: stats?.totalUsers ?? '—', color: 'text-white', onClick: undefined },
    { label: 'Active Channels', value: stats?.totalChannels ?? '—', color: 'text-white', onClick: undefined },
    { label: 'Sessions (24h)', value: stats?.streamsLast24h ?? '—', color: 'text-white', onClick: undefined },
    { label: 'Errors (24h)', value: stats?.errorsLast24h ?? '—', color: errorCount > 0 ? 'text-red-400' : 'text-white', onClick: errorCount > 0 ? () => setShowErrors(v => !v) : undefined },
    { label: 'New Users (7d)', value: stats?.newUsersLast7d ?? '—', color: 'text-white', onClick: undefined },
  ]

  return (
    <div className="space-y-6 pt-px">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ label, value, color, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className={`bg-gray-800 rounded-xl p-4 ${onClick ? 'cursor-pointer hover:bg-gray-750 hover:ring-1 hover:ring-red-500/50 transition-colors' : ''} ${onClick && showErrors ? 'ring-1 ring-red-500/50' : ''}`}
          >
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1 leading-tight">{label}</p>
            <p className={`text-2xl font-semibold ${color}`}>{value}</p>
            {onClick && <p className="text-red-400/70 text-xs mt-1">{showErrors ? 'hide ▴' : 'view ▾'}</p>}
          </div>
        ))}
      </div>

      {/* Error streams detail — shown when Errors card is clicked */}
      {showErrors && (
        <Section title="Error Streams (24h)" badge={errorCount} hint="streams that failed in the last 24 hours">
          {!errorStreams
            ? <Empty>Loading…</Empty>
            : errorStreams.length === 0
            ? <Empty>No error streams found.</Empty>
            : (
              <div className="divide-y divide-gray-700">
                {errorStreams.map(s => {
                  const startedAt = new Date(s.startedAt)
                  const minsAgo = Math.floor((errorsUpdatedAt - startedAt.getTime()) / 60_000)
                  const timeAgo = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ${minsAgo % 60}m ago`
                  return (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate">{s.channelName}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{s.username ?? `User ${s.userId}`}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-red-400 text-xs font-medium">{timeAgo}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {startedAt.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          {' '}
                          {startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
        </Section>
      )}

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
                          <Td><LiveDuration startedAt={s.startedAt} /></Td>
                          <Td right>
                            <button
                              onClick={() => { if (confirm(`Kill ${s.username ?? 'this user'}'s stream of ${s.channelName}?`)) stopStream.mutate(s.id) }}
                              disabled={stopStream.isPending && stopStream.variables === s.id}
                              className="text-sm border border-red-900 text-red-500 hover:bg-red-600 hover:border-red-600 hover:text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
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

function LiveDuration({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = now - new Date(startedAt).getTime()
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return <>{secs}s</>
  const mins = Math.floor(secs / 60)
  if (mins < 60) return <>{mins}m {secs % 60}s</>
  return <>{Math.floor(mins / 60)}h {mins % 60}m</>
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
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
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
          {loading ? 'Importing…' : 'Open file'}
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
        <div className="overflow-x-auto">
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

// ── Audit tab ─────────────────────────────────────────────────────────────────

const AUDIT_PAGE_SIZE = 50

const ACTION_COLORS: Record<string, string> = {
  Login: 'text-green-400',
  LoginFailed: 'text-red-400',
  Logout: 'text-gray-400',
  Register: 'text-blue-400',
  PasswordChanged: 'text-yellow-400',
  PasswordReset: 'text-yellow-400',
  UserCreated: 'text-blue-400',
  UserUpdated: 'text-blue-300',
  UserDeleted: 'text-red-400',
  CategoryCreated: 'text-violet-400',
  CategoryUpdated: 'text-violet-300',
  CategoryDeleted: 'text-red-400',
  CategoryDeleteAll: 'text-red-500',
  ChannelCreated: 'text-violet-400',
  ChannelUpdated: 'text-violet-300',
  ChannelDeleted: 'text-red-400',
  ChannelDeleteAll: 'text-red-500',
  ProviderCreated: 'text-blue-400',
  ProviderUpdated: 'text-blue-300',
  ProviderDeleted: 'text-red-400',
  StreamStarted: 'text-green-400',
  StreamStopped: 'text-gray-400',
  StreamKilled: 'text-red-400',
  ImportCompleted: 'text-teal-400',
  EpgImportCompleted: 'text-teal-400',
  SettingsUpdated: 'text-orange-400',
}

function AuditTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [inputValue, setInputValue] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', page, search],
    queryFn: () => adminApi.getAuditLogs(page, AUDIT_PAGE_SIZE, search || undefined),
  })

  function handleSearchChange(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1) }, 300)
  }

  const entries = data?.items ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div className="flex flex-col gap-4 pb-3 md:h-full md:overflow-hidden">
      <div className="shrink-0">
        <input
          type="search"
          placeholder="Search by user or description…"
          value={inputValue}
          onChange={e => handleSearchChange(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-72"
        />
      </div>

      <div className="md:flex-1 md:min-h-0 md:overflow-hidden">
        {isLoading
          ? <div className="text-gray-400 text-sm">Loading…</div>
          : entries.length === 0
          ? <div className="text-gray-500 text-sm">No audit log entries found.</div>
          : (
          <div className="bg-gray-800 rounded-xl overflow-auto md:overflow-hidden md:h-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800 z-10">
                <tr className="border-b border-gray-700">
                  <Th>Time</Th>
                  <Th>Action</Th>
                  <Th>Actor</Th>
                  <Th>Description</Th>
                  <Th>IP</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {entries.map(entry => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-0.5 sm:gap-1">
          <HPageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</HPageButton>
          {hPageNumbers(page, totalPages).map((p, i) =>
            p === '…'
              ? <span key={`e-${i}`} className="px-2 text-gray-600">…</span>
              : <HPageButton key={p} onClick={() => setPage(p as number)} active={p === page}>{p}</HPageButton>
          )}
          <HPageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</HPageButton>
        </div>
      )}
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditLogDto }) {
  const colorCls = ACTION_COLORS[entry.action] ?? 'text-gray-300'
  return (
    <tr className="hover:bg-gray-750">
      <Td>
        <span className="text-gray-500 text-xs whitespace-nowrap">
          {new Date(entry.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </Td>
      <Td><span className={`font-mono text-xs ${colorCls}`}>{entry.action}</span></Td>
      <Td><span className="text-gray-300 text-xs">{entry.actorUsername ?? <span className="text-gray-600">—</span>}</span></Td>
      <Td><span className="text-gray-400 text-xs">{entry.description ?? '—'}</span></Td>
      <Td><span className="text-gray-600 text-xs font-mono">{entry.ipAddress ?? '—'}</span></Td>
    </tr>
  )
}
