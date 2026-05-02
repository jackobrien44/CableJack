import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { userApi } from '../api/user'
import { epgApi } from '../api/epg'
import { adminApi } from '../api/admin'
import { providersApi } from '../api/providers'
import { useAuth } from '../hooks/useAuth'
import { httpsUrl } from '../utils/url'
import type { ProgrammeResponse } from '../types/api'

function epgProgress(prog: ProgrammeResponse): number {
  const now = Date.now()
  const start = new Date(prog.startTime).getTime()
  const end = new Date(prog.endTime).getTime()
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtHours(seconds: number) {
  const h = Math.floor(seconds / 3600)
  return h === 1 ? '1 hr' : `${h} hrs`
}

interface ChannelCardProps {
  id: number
  name: string
  logoUrl?: string | null
  nowPlaying?: ProgrammeResponse
}

function ChannelCard({ id, name, logoUrl, nowPlaying }: ChannelCardProps) {
  const pct = nowPlaying ? epgProgress(nowPlaying) : null

  return (
    <Link
      to={`/channels/${id}`}
      className="group flex flex-col bg-gray-800 rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/60 min-w-[300px] shrink-0"
    >
      <div className="relative aspect-video bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
        {/* Logo — always visible */}
        {logoUrl
          ? <img
              src={httpsUrl(logoUrl)}
              alt={name}
              className="max-w-[80%] max-h-[70%] object-contain"
              style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.6)) drop-shadow(0 0 6px rgba(255,255,255,0.15))' }}
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          : (
            <div className="w-20 h-20 rounded-2xl bg-gray-600 flex items-center justify-center select-none">
              <span className="text-3xl font-bold text-gray-300">{name.charAt(0).toUpperCase()}</span>
            </div>
          )
        }

        {/* Play button — fades in on hover so it never obscures the logo at rest */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/30">
          <div className="w-14 h-14 rounded-full bg-black/60 border border-white/30 flex items-center justify-center backdrop-blur-sm">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* EPG overlay */}
        {nowPlaying && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent px-4 pt-10 pb-3">
            <p className="text-white text-xs font-medium line-clamp-1 leading-snug">{nowPlaying.title}</p>
            <div className="mt-1.5 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3.5">
        <p className="text-white text-sm font-semibold truncate">{name}</p>
        {nowPlaying
          ? <p className="text-gray-500 text-xs mt-0.5">{formatTime(nowPlaying.startTime)} – {formatTime(nowPlaying.endTime)}</p>
          : <p className="text-gray-600 text-xs mt-0.5">No EPG data</p>
        }
      </div>
    </Link>
  )
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      {to && (
        <Link to={to} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
          See all
        </Link>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  )
}

export default function HomePage() {
  const { user, isAdmin } = useAuth()

  const { data: historyData } = useQuery({
    queryKey: ['history', 1, 20],
    queryFn: () => userApi.getHistory(1, 20),
  })

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })

  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: userApi.getStats,
  })

  const { data: nowPlaying = [] } = useQuery({
    queryKey: ['epg-now'],
    queryFn: epgApi.getAllNowPlaying,
    refetchInterval: 60_000,
  })

  const { data: dashStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: adminApi.getDashboardStats,
    enabled: isAdmin,
  })

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: providersApi.getAll,
    enabled: isAdmin,
  })

  const nowPlayingMap = useMemo(() => {
    const map = new Map<number, ProgrammeResponse>()
    for (const p of nowPlaying) map.set(p.channelId, p)
    return map
  }, [nowPlaying])

  const recentChannels = useMemo(() => {
    const seen = new Set<number>()
    const result: { channelId: number; channelName: string; channelLogoUrl: string | null }[] = []
    for (const h of historyData?.items ?? []) {
      if (!seen.has(h.channelId)) {
        seen.add(h.channelId)
        result.push({ channelId: h.channelId, channelName: h.channelName, channelLogoUrl: h.channelLogoUrl })
      }
      if (result.length >= 8) break
    }
    return result
  }, [historyData])

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites])

  const whatsOn = useMemo(() =>
    nowPlaying.filter(p => !favoriteIds.has(p.channelId)).slice(0, 12),
    [nowPlaying, favoriteIds]
  )

  const expiringProviders = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return providers.filter(p => {
      if (!p.expiresAt) return false
      const days = Math.ceil((new Date(p.expiresAt).getTime() - today.getTime()) / 86400000)
      return days <= 30
    })
  }, [providers])

  const hour = new Date().getHours()
  const greetingText = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateText = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const hasContent = recentChannels.length > 0 || favorites.length > 0 || whatsOn.length > 0

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-white">{greetingText}, {user?.username}</h1>
          <p className="text-gray-500 text-sm mt-1">{dateText}</p>
          {userStats && (userStats.favoriteCount > 0 || userStats.historyCount > 0) && (
            <div className="flex gap-4 mt-2.5">
              {userStats.favoriteCount > 0 && (
                <span className="text-gray-600 text-xs">{userStats.favoriteCount} favorite{userStats.favoriteCount !== 1 ? 's' : ''}</span>
              )}
              {userStats.historyCount > 0 && (
                <span className="text-gray-600 text-xs">{userStats.historyCount} sessions</span>
              )}
              {userStats.totalWatchSeconds >= 3600 && (
                <span className="text-gray-600 text-xs">{fmtHours(userStats.totalWatchSeconds)} watched</span>
              )}
            </div>
          )}
        </div>

        {/* Continue Watching */}
        {recentChannels.length > 0 && (
          <section>
            <SectionHeader title="Continue Watching" to="/channels" />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {recentChannels.map(ch => (
                <ChannelCard
                  key={ch.channelId}
                  id={ch.channelId}
                  name={ch.channelName}
                  logoUrl={ch.channelLogoUrl}
                  nowPlaying={nowPlayingMap.get(ch.channelId)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Favorites */}
        {favorites.length > 0 && (
          <section>
            <SectionHeader title="Your Favorites" to="/favorites" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {favorites.map(ch => (
                <ChannelCard
                  key={ch.id}
                  id={ch.id}
                  name={ch.name}
                  logoUrl={ch.logoUrl}
                  nowPlaying={nowPlayingMap.get(ch.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* What's On Now */}
        {whatsOn.length > 0 && (
          <section>
            <SectionHeader title="What's On Now" to="/guide" />
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {whatsOn.map(prog => (
                <ChannelCard
                  key={prog.channelId}
                  id={prog.channelId}
                  name={prog.channelName}
                  logoUrl={prog.channelLogoUrl}
                  nowPlaying={prog}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!hasContent && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl mb-4">📺</span>
            <p className="text-white font-medium">Nothing here yet</p>
            <p className="text-gray-500 text-sm mt-1">Browse channels and add some favorites to get started</p>
            <Link
              to="/channels"
              className="mt-4 bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Browse Channels
            </Link>
          </div>
        )}

        {/* Admin: System stats */}
        {isAdmin && dashStats && (
          <section>
            <SectionHeader title="System" to="/admin" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Active Streams" value={dashStats.activeStreams} />
              <StatCard label="Total Channels" value={dashStats.totalChannels} />
              <StatCard label="Total Users" value={dashStats.totalUsers} />
            </div>
          </section>
        )}

        {/* Admin: Provider alerts */}
        {isAdmin && expiringProviders.length > 0 && (
          <section>
            <SectionHeader title="Provider Alerts" to="/admin" />
            <div className="space-y-2">
              {expiringProviders.map(p => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const daysLeft = Math.ceil((new Date(p.expiresAt!).getTime() - today.getTime()) / 86400000)
                const expired = daysLeft < 0
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border ${expired ? 'bg-red-900/30 border-red-800' : 'bg-amber-900/30 border-amber-800'}`}
                  >
                    <p className={`text-sm font-medium ${expired ? 'text-red-300' : 'text-amber-300'}`}>{p.name}</p>
                    <p className={`text-xs ${expired ? 'text-red-400' : 'text-amber-400'}`}>
                      {expired
                        ? `Expired ${Math.abs(daysLeft)}d ago`
                        : daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft}d`}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
