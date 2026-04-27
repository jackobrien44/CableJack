import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { channelsApi } from '../api/channels'
import { userApi } from '../api/user'
import { streamsApi } from '../api/streams'
import type { ChannelResponse } from '../types/api'

export default function ChannelsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['channels', debouncedSearch],
    queryFn: () => channelsApi.getAll({ search: debouncedSearch || undefined, pageSize: 100 }),
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

  const startStream = useMutation({
    mutationFn: (channelId: number) => streamsApi.start(channelId),
    onSuccess: (stream) => navigate(`/player/${stream.id}`),
  })

  function handleSearchChange(value: string) {
    setSearch(value)
    clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer)
    ;(handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }

  function toggleFavorite(channel: ChannelResponse) {
    if (favoriteIds.has(channel.id)) {
      removeFavorite.mutate(channel.id)
    } else {
      addFavorite.mutate(channel.id)
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Channels</h1>
        <input
          type="search"
          placeholder="Search channels…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-60"
        />
      </div>

      {isLoading && (
        <div className="text-gray-400 text-sm">Loading channels…</div>
      )}

      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {data.items.map(channel => (
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
      )}

      {data?.items.length === 0 && (
        <div className="text-gray-500 text-sm">No channels found.</div>
      )}
    </div>
  )
}

interface ChannelCardProps {
  channel: ChannelResponse
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  isStarting: boolean
}

function ChannelCard({ channel, isFavorite, onPlay, onToggleFavorite, isStarting }: ChannelCardProps) {
  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden group relative">
      <button
        onClick={onPlay}
        disabled={isStarting}
        className="w-full aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden"
      >
        {channel.logoUrl ? (
          <img
            src={channel.logoUrl}
            alt={channel.name}
            className="max-w-full max-h-full object-contain p-3"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <span className="text-gray-600 text-3xl">📺</span>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isStarting ? (
            <span className="text-white text-sm">Starting…</span>
          ) : (
            <span className="text-white text-2xl">▶</span>
          )}
        </div>
      </button>

      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-white text-xs font-medium truncate">{channel.name}</span>
        <button
          onClick={onToggleFavorite}
          className={`text-sm shrink-0 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
        >
          ★
        </button>
      </div>

      <div className="px-3 pb-2">
        <span className="text-gray-500 text-xs truncate block">{channel.categoryName}</span>
      </div>
    </div>
  )
}
