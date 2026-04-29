import { useRef, useState, useEffect } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { channelsApi } from '../api/channels'
import { categoriesApi } from '../api/categories'
import { providersApi } from '../api/providers'
import { userApi } from '../api/user'
import { ChannelCard } from '../components/ChannelCard'
import { useStartStream } from '../hooks/useStartStream'
import type { ChannelResponse } from '../types/api'

const MIN_CARD_W = 175
const MIN_CARD_H = 240
const GAP = 12

export default function ChannelsPage() {
  const queryClient = useQueryClient()
  const { categoryId: categoryIdParam } = useParams<{ categoryId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined
  const providerId = searchParams.get('provider') ? Number(searchParams.get('provider')) : undefined
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
  const [inputValue, setInputValue] = useState(search)
  const [showCategories, setShowCategories] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null)
  const [gridDims, setGridDims] = useState({ cols: 6, rows: 4 })
  const pageSize = gridDims.cols * gridDims.rows

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.getAll,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['channels', search, categoryId, providerId, page, pageSize],
    queryFn: () => channelsApi.getAll({ page, pageSize, search: search || undefined, categoryId, providerId }),
  })

  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })
  const favoriteIds = new Set(favorites?.map(f => f.id) ?? [])

  const addFavorite = useMutation({
    mutationFn: userApi.addFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })
  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })
  const startStream = useStartStream()

  function setPage(p: number) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete('page')
      else next.set('page', String(p))
      return next
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleSearchChange(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        if (value) next.set('q', value)
        else next.delete('q')
        next.delete('page')
        return next
      }, { replace: true })
    }, 300)
  }

  function setCategoryId(id: number | undefined) {
    navigate(id ? `/categories/${id}` : '/')
  }

  function setProviderId(id: number | undefined) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (id !== undefined) next.set('provider', String(id))
      else next.delete('provider')
      next.delete('page')
      return next
    }, { replace: true })
  }

  function toggleFavorite(channel: ChannelResponse) {
    if (favoriteIds.has(channel.id)) removeFavorite.mutate(channel.id)
    else addFavorite.mutate(channel.id)
  }

  const channels = data?.items ?? []
  const totalPages = data ? Math.ceil(data.totalCount / pageSize) : 1

  useEffect(() => {
    if (!gridEl) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const cols = Math.max(1, Math.floor((width + GAP) / (MIN_CARD_W + GAP)))
      const rows = Math.max(1, Math.floor((height + GAP) / (MIN_CARD_H + GAP)))
      setGridDims(prev => prev.cols === cols && prev.rows === rows ? prev : { cols, rows })
    })
    ro.observe(gridEl)
    return () => ro.disconnect()
  }, [gridEl])
  const categories = categoriesData?.items ?? []
  const providers = providersData ?? []

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-6 pb-4 gap-3 shrink-0">
        <h1 className="text-xl font-semibold text-white shrink-0">Channels</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {providers.length > 0 && (
            <select
              value={providerId ?? ''}
              onChange={e => setProviderId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-auto"
            >
              <option value="">All providers</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <input
            type="search"
            placeholder="Search channels…"
            value={inputValue}
            onChange={e => handleSearchChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-56"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-4 shrink-0">
          <button
            onClick={() => setShowCategories(v => !v)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-wider mb-2 transition-colors"
          >
            <span>{showCategories ? '▾' : '▸'}</span>
            Categories
            {categoryId !== undefined && !showCategories && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-violet-600 text-white normal-case tracking-normal">
                {categories.find(c => c.id === categoryId)?.name}
              </span>
            )}
          </button>
          {showCategories && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setCategoryId(undefined)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  categoryId === undefined ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id === categoryId ? undefined : cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    categoryId === cat.id ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && <div className="text-gray-400 text-sm">Loading channels…</div>}

      {!isLoading && channels.length === 0 && (
        <div className="text-gray-500 text-sm">No channels found.</div>
      )}

      {channels.length > 0 && (
        <div ref={setGridEl} className="flex-1 min-h-0 overflow-hidden">
          <div
            className="h-full grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridDims.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridDims.rows}, 1fr)`,
            }}
          >
            {channels.map(channel => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                isFavorite={favoriteIds.has(channel.id)}
                onPlay={() => startStream.mutate(channel.id)}
                onToggleFavorite={() => toggleFavorite(channel)}
                isStarting={startStream.isPending && startStream.variables === channel.id}
              />
            ))}
          </div>
        </div>
      )}

      {channels.length > 0 && totalPages > 1 && (
        <div className="py-3 flex items-center justify-center gap-0.5 sm:gap-1 shrink-0">
          <PageButton onClick={() => setPage(page - 1)} disabled={page === 1}>‹</PageButton>
          {pageNumbers(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
            ) : (
              <PageButton key={p} onClick={() => setPage(p as number)} active={p === page}>{p}</PageButton>
            )
          )}
          <PageButton onClick={() => setPage(page + 1)} disabled={page === totalPages}>›</PageButton>
        </div>
      )}
    </div>
  )
}

function PageButton({ onClick, disabled, active, children }: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[1.75rem] h-8 px-1 sm:min-w-[2.25rem] sm:h-9 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-30 ${
        active
          ? 'bg-violet-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
