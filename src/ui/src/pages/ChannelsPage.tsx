import { useRef, useState } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'

import { channelsApi } from '../api/channels'
import { categoriesApi } from '../api/categories'
import { providersApi } from '../api/providers'
import { userApi } from '../api/user'
import { ChannelCard } from '../components/ChannelCard'
import { useStartStream } from '../hooks/useStartStream'
import type { ChannelResponse } from '../types/api'

const PAGE_SIZE = 48

export default function ChannelsPage() {
  const queryClient = useQueryClient()
  const { categoryId: categoryIdParam } = useParams<{ categoryId?: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined
  const providerId = searchParams.get('provider') ? Number(searchParams.get('provider')) : undefined
  const [inputValue, setInputValue] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  })

  const { data: providersData } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.getAll,
  })

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['channels', search, categoryId, providerId],
    queryFn: ({ pageParam = 1 }) =>
      channelsApi.getAll({ page: pageParam, pageSize: PAGE_SIZE, search: search || undefined, categoryId, providerId }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasNextPage ? last.page + 1 : undefined,
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

  function setParam(key: string, value: string | undefined) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    }, { replace: true })
  }

  function handleSearchChange(value: string) {
    setInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setParam('q', value || undefined), 300)
  }

  function setCategoryId(id: number | undefined) {
    navigate(id ? `/categories/${id}` : '/')
  }

  function setProviderId(id: number | undefined) {
    setParam('provider', id?.toString())
  }

  function toggleFavorite(channel: ChannelResponse) {
    if (favoriteIds.has(channel.id)) removeFavorite.mutate(channel.id)
    else addFavorite.mutate(channel.id)
  }

  const channels = data?.pages.flatMap(p => p.items) ?? []
  const categories = categoriesData?.items ?? []
  const providers = providersData ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h1 className="text-xl font-semibold text-white shrink-0">Channels</h1>
        <div className="flex items-center gap-2">
          {providers.length > 0 && (
            <select
              value={providerId ?? ''}
              onChange={e => setProviderId(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-56"
          />
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
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

      {isLoading && <div className="text-gray-400 text-sm">Loading channels…</div>}

      {channels.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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

          {hasNextPage && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition-colors"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {!isLoading && channels.length === 0 && (
        <div className="text-gray-500 text-sm">No channels found.</div>
      )}
    </div>
  )
}
