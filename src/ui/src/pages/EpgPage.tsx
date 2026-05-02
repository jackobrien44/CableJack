import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { epgApi } from '../api/epg'
import { useStartStream } from '../hooks/useStartStream'
import { usePlatform } from '../hooks/usePlatform'
import { Focusable } from '../components/tv'

export default function EpgPage() {
  const { data: nowPlaying, isLoading } = useQuery({
    queryKey: ['epg-now-all'],
    queryFn: epgApi.getAllNowPlaying,
    refetchInterval: 60_000,
  })

  const [now] = useState(Date.now)
  const [search, setSearch] = useState('')
  const startStream = useStartStream()
  const { isTV } = usePlatform()

  const filtered = search.trim()
    ? (nowPlaying ?? []).filter(p => p.channelName.toLowerCase().includes(search.toLowerCase()))
    : (nowPlaying ?? [])

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isTV ? 120 : 80,
    overscan: 8,
  })

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
    <div className="flex-1 flex flex-col min-h-0 p-6 pb-4">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2 shrink-0">
        <h1 className={`font-semibold text-white ${isTV ? 'text-3xl' : 'text-xl'}`}>TV Guide</h1>
        {!isTV && (
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
        )}
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm shrink-0">No channels match your search.</p>
      )}

      <div ref={parentRef} className="flex-1 min-h-0 overflow-y-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualItem => {
            const programme = filtered[virtualItem.index]
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '8px',
                }}
              >
                <Focusable
                  onEnterPress={() => startStream.mutate(programme.channelId)}
                  focusClassName="ring-2 ring-violet-400 rounded-xl"
                >
                  <div className={`bg-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${isTV ? 'px-6 py-5' : 'px-4 py-3'}`}>
                    <div className={`sm:shrink-0 w-full text-left sm:text-right ${isTV ? 'sm:w-48' : 'sm:w-32'}`}>
                      <p className={`text-white font-medium truncate ${isTV ? 'text-xl' : 'text-sm'}`}>{programme.channelName}</p>
                    </div>

                    <div className="hidden sm:block w-px h-8 bg-gray-700 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <p className={`text-white font-medium truncate ${isTV ? 'text-xl' : 'text-sm'}`}>{programme.title}</p>
                      {programme.description && (
                        <p className={`text-gray-500 mt-0.5 line-clamp-1 ${isTV ? 'text-base' : 'text-xs'}`}>{programme.description}</p>
                      )}
                    </div>

                    <div className="sm:shrink-0 w-full sm:w-auto text-left sm:text-right">
                      <p className={`text-gray-400 ${isTV ? 'text-base' : 'text-xs'}`}>
                        {fmtTime(programme.startTime)} – {fmtTime(programme.endTime)}
                      </p>
                      <ProgressBar start={programme.startTime} end={programme.endTime} now={now} />
                    </div>

                    <button
                      onClick={() => startStream.mutate(programme.channelId)}
                      disabled={startStream.isPending && startStream.variables === programme.channelId}
                      className={`shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors w-full sm:w-auto ${isTV ? 'text-xl px-6 py-3' : 'text-xs px-3 py-1.5 min-h-[44px]'}`}
                    >
                      Watch
                    </button>
                  </div>
                </Focusable>
              </div>
            )
          })}
        </div>
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
