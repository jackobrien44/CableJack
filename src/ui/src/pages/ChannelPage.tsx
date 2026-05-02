import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { channelsApi } from '../api/channels'
import { epgApi } from '../api/epg'
import { userApi } from '../api/user'
import { useStartStream } from '../hooks/useStartStream'
import type { ProgrammeResponse } from '../types/api'
import { httpsUrl } from '../utils/url'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function nowPlayingProgress(start: string, end: string) {
  const now = Date.now()
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (e <= s) return 0
  return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100))
}

export default function ChannelPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: channel, isLoading } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => channelsApi.getById(channelId),
  })

  const { data: nowPlaying } = useQuery({
    queryKey: ['epg-now', channelId],
    queryFn: () => epgApi.getNowPlaying(channelId),
    retry: false,
    throwOnError: false,
  })

  const { data: upcoming } = useQuery({
    queryKey: ['epg-upcoming', channelId],
    queryFn: () => {
      const from = new Date().toISOString()
      const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      return epgApi.getProgrammes(channelId, from, to)
    },
    retry: false,
    throwOnError: false,
  })

  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })
  const isFavorite = favorites?.some(f => f.id === channelId) ?? false

  const addFavorite = useMutation({
    mutationFn: userApi.addFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })
  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const startStream = useStartStream()

  function toggleFavorite() {
    if (isFavorite) removeFavorite.mutate(channelId)
    else addFavorite.mutate(channelId)
  }

  if (isLoading) {
    return <div className="flex-1 p-6 text-gray-400 text-sm">Loading…</div>
  }

  if (!channel) {
    return <div className="flex-1 p-6 text-gray-500 text-sm">Channel not found.</div>
  }

  const progress = nowPlaying ? nowPlayingProgress(nowPlaying.startTime, nowPlaying.endTime) : null
  const upcomingList = upcoming?.filter(p => p.id !== nowPlaying?.id) ?? []

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-6"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-6">
        <div className="w-full h-52 sm:w-56 sm:h-56 bg-gray-900 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
          {channel.logoUrl ? (
            <img
              src={httpsUrl(channel.logoUrl)}
              alt={channel.name}
              className="max-w-full max-h-full object-contain p-4"
              style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.6)) drop-shadow(0 0 6px rgba(255,255,255,0.15))' }}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <span className="text-7xl">📺</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-4xl font-bold text-white leading-tight">{channel.name}</h1>
            <button
              onClick={toggleFavorite}
              className={`text-3xl shrink-0 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              ★
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <Link
              to={`/categories/${channel.categoryId}`}
              className="px-2.5 py-0.5 rounded-full bg-violet-600/20 text-violet-300 text-xs font-medium border border-violet-600/30 hover:bg-violet-600/30 transition-colors"
            >
              {channel.categoryName}
            </Link>
            {channel.providerName && (
              <span className="px-2.5 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs font-medium">
                {channel.providerName}
              </span>
            )}
          </div>

          {channel.description && (
            <p className="text-gray-400 text-sm mt-3 leading-relaxed">{channel.description}</p>
          )}

          <button
            onClick={() => startStream.mutate(channelId)}
            disabled={startStream.isPending}
            className="mt-4 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {startStream.isPending ? 'Starting…' : '▶ Watch'}
          </button>
        </div>
      </div>

      {/* Now Playing */}
      {nowPlaying && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Now Playing</h2>
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">{nowPlaying.title}</p>
                {nowPlaying.description && (
                  <p className="text-gray-400 text-sm mt-1 leading-relaxed line-clamp-3">{nowPlaying.description}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-gray-400 text-xs whitespace-nowrap">
                  {fmtTime(nowPlaying.startTime)} – {fmtTime(nowPlaying.endTime)}
                </p>
              </div>
            </div>
            {progress !== null && (
              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Up Next */}
      {upcomingList.length > 0 && (
        <div className="mt-8 mb-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Up Next</h2>
          <div className="divide-y divide-gray-800">
            {upcomingList.map(p => <ScheduleRow key={p.id} programme={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function ScheduleRow({ programme }: { programme: ProgrammeResponse }) {
  return (
    <div className="flex gap-4 py-3 hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors">
      <div className="text-gray-500 text-sm w-16 shrink-0 pt-0.5">
        <span className="block">{fmtTime(programme.startTime)}</span>
        <span className="block">{fmtTime(programme.endTime)}</span>
      </div>
      <div className="min-w-0">
        <p className="text-gray-200 text-sm font-medium truncate">{programme.title}</p>
        {programme.description && (
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{programme.description}</p>
        )}
      </div>
    </div>
  )
}
