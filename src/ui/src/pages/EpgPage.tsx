import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { epgApi } from '../api/epg'
import { useStartStream } from '../hooks/useStartStream'

export default function EpgPage() {
  const { data: nowPlaying, isLoading } = useQuery({
    queryKey: ['epg-now-all'],
    queryFn: epgApi.getAllNowPlaying,
    refetchInterval: 60_000,
  })

  const [now] = useState(Date.now)
  const [search, setSearch] = useState('')
  const startStream = useStartStream()

  const filtered = search.trim()
    ? (nowPlaying ?? []).filter(p => p.channelName.toLowerCase().includes(search.toLowerCase()))
    : (nowPlaying ?? [])

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading guide…</div>

  if (!nowPlaying?.length) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-white mb-2">TV Guide</h1>
        <p className="text-gray-500 text-sm">No programme data available. Import an XMLTV file in Admin to populate the guide.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between mb-6 gap-2">
        <h1 className="text-xl font-semibold text-white">TV Guide</h1>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="Filter channels…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 text-white text-sm placeholder-gray-500 border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-500 w-48"
          />
          <span className="text-gray-500 text-xs">Now playing · updates every minute</span>
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm">No channels match your search.</p>
      )}
      <div className="space-y-2">
        {filtered.map(programme => (
          <div
            key={programme.id}
            className="bg-gray-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
          >
            <div className="sm:shrink-0 sm:w-32 w-full text-left sm:text-right">
              <p className="text-white text-sm font-medium truncate">{programme.channelName}</p>
            </div>

            <div className="hidden sm:block w-px h-8 bg-gray-700 shrink-0" />

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{programme.title}</p>
              {programme.description && (
                <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">{programme.description}</p>
              )}
            </div>

            <div className="sm:shrink-0 w-full sm:w-auto text-left sm:text-right">
              <p className="text-gray-400 text-xs">
                {fmtTime(programme.startTime)} – {fmtTime(programme.endTime)}
              </p>
              <ProgressBar start={programme.startTime} end={programme.endTime} now={now} />
            </div>

            <button
              onClick={() => startStream.mutate(programme.channelId)}
              disabled={startStream.isPending && startStream.variables === programme.channelId}
              className="shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors min-h-[44px] w-full sm:w-auto"
            >
              Watch
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressBar({ start, end, now }: { start: string; end: string; now: number }) {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  const pct = Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100))

  return (
    <div className="mt-1 h-1 w-20 bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
