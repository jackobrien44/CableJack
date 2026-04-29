import { useRef, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { MediaPlayer, MediaProvider, isHLSProvider } from '@vidstack/react'
import type { MediaPlayerInstance } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { streamsApi } from '../api/streams'
import { epgApi } from '../api/epg'
import type { ProgrammeResponse } from '../types/api'

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = Number(id)
  const navigate = useNavigate()
  const startedRef = useRef(false)
  const cancelledRef = useRef(false)
  const [streamId, setStreamId] = useState<number | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const ffmpegPaused = useRef(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const playerRef = useRef<MediaPlayerInstance>(null)
  const [resolution, setResolution] = useState<string | null>(null)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    streamsApi.start(channelId)
      .then(s => {
        if (cancelledRef.current) {
          streamsApi.stop(s.id).catch(() => {})
        } else {
          setStreamId(s.id)
        }
      })
      .catch(() => { if (!cancelledRef.current) setStartError('Failed to start stream.') })
  }, [channelId])

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => streamsApi.getById(streamId!),
    enabled: streamId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'Starting' || status === 'Running' ? 2000 : false
    },
  })

  const { data: nowPlaying } = useQuery({
    queryKey: ['epg-now', channelId],
    queryFn: () => epgApi.getNowPlaying(channelId),
    refetchInterval: 60_000,
  })

  const { data: upcoming } = useQuery({
    queryKey: ['epg-upcoming', channelId],
    queryFn: () => {
      const from = new Date().toISOString()
      const to = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      return epgApi.getProgrammes(channelId, from, to)
    },
    refetchInterval: 60_000,
  })

  const stop = useMutation({
    mutationFn: () => streamsApi.stop(streamId!),
    onSuccess: () => navigate(-1),
  })

  const pause = useMutation({ mutationFn: () => streamsApi.pause(streamId!) })
  const resume = useMutation({ mutationFn: () => streamsApi.resume(streamId!) })

  useEffect(() => {
    return playerRef.current?.subscribe(({ quality }) => {
      setResolution(quality?.height ? `${quality.height}p` : null)
    })
  }, [])

  const upcomingList = upcoming?.filter(p => p.id !== nowPlaying?.id) ?? []
  const isRunning = stream?.status === 'Running' && !!stream?.url
  const isStarting = (startError == null && streamId == null) || stream?.status === 'Starting'

  function handleExit() {
    if (streamId !== null) {
      stop.mutate()
    } else {
      cancelledRef.current = true
      navigate(-1)
    }
  }

  return (
    <div className="flex flex-col md:flex-row bg-gray-950 h-svh overflow-hidden">

      {/* Player column */}
      <div className="flex-1 h-[45svh] md:h-svh relative bg-black">

        {/* Status overlays */}
        {isStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <p className="text-gray-400 text-sm pointer-events-none">Starting stream…</p>
            <button
              onClick={handleExit}
              className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {stream?.status === 'Error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <p className="text-red-400 text-sm pointer-events-none">Stream error. The source may be unavailable.</p>
            <button
              onClick={handleExit}
              disabled={stop.isPending}
              className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
            >
              Go back
            </button>
          </div>
        )}
        {startError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <p className="text-red-400 text-sm pointer-events-none">{startError}</p>
            <button
              onClick={handleExit}
              className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
            >
              Go back
            </button>
          </div>
        )}

        {/* Vidstack player — always mounted so controls are visible during loading */}
        <MediaPlayer
          ref={playerRef}
          src={isRunning ? { src: stream.url, type: 'application/x-mpegurl' } : undefined}
          minLiveDVRWindow={30}
          className="w-full h-full dark"
          onProviderSetup={e => {
            if (isHLSProvider(e.detail)) {
              e.detail.config = { liveSyncDurationCount: 4 }
            }
          }}
          onCanPlay={() => playerRef.current?.play()}
          onPause={() => { ffmpegPaused.current = true; pause.mutate() }}
          onPlay={() => {
            if (!ffmpegPaused.current) return
            ffmpegPaused.current = false
            resume.mutate()
          }}
        >
          <MediaProvider />
          <DefaultVideoLayout
            icons={defaultLayoutIcons}
            slots={{
              beforePlayButton: (
                <button
                  onClick={() => stop.mutate()}
                  disabled={stop.isPending}
                  className="vds-button"
                  title="Stop and go back"
                  aria-label="Stop"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              ),
              afterFullscreenButton: (
                <>
                  {resolution && (
                    <span className="vds-button text-xs text-gray-300 pointer-events-none select-none px-1">
                      {resolution}
                    </span>
                  )}
                  <button
                    onClick={() => setShowSidebar(v => !v)}
                  className="vds-button"
                  title={showSidebar ? 'Hide info' : 'Show info'}
                  aria-label="Toggle sidebar"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    {showSidebar
                      ? <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm6 9.59L14.59 12 9 6.41 7.59 7.83 11.17 12l-3.58 4.17L9 17.59z"/>
                      : <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z"/>
                    }
                  </svg>
                </button>
                </>
              ),
            }}
          />
        </MediaPlayer>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="w-full border-t md:w-80 xl:w-96 flex flex-col md:border-l md:border-t-0 border-gray-800 max-h-[55svh] md:max-h-none md:h-svh overflow-hidden">
          {/* Now playing */}
          <div className="px-5 py-4 border-b border-gray-800 shrink-0">
            <p className="text-white font-semibold text-sm mb-2">{stream?.channelName ?? '…'}</p>
            {nowPlaying ? (
              <>
                <p className="text-gray-200 text-sm font-medium">{nowPlaying.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {fmtTime(nowPlaying.startTime)} – {fmtTime(nowPlaying.endTime)}
                </p>
                {nowPlaying.description && (
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">{nowPlaying.description}</p>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-sm">No EPG data</p>
            )}
          </div>

          {/* Schedule */}
          {upcomingList.length > 0 && (
            <div className="flex flex-col overflow-hidden flex-1">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-5 py-3 shrink-0">Up Next</p>
              <div className="overflow-y-auto divide-y divide-gray-800">
                {upcomingList.map(p => <ScheduleRow key={p.id} programme={p} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScheduleRow({ programme }: { programme: ProgrammeResponse }) {
  return (
    <div className="flex gap-4 px-5 py-3 hover:bg-gray-900 transition-colors">
      <span className="text-gray-500 text-sm w-20 shrink-0 pt-0.5">{fmtTime(programme.startTime)}</span>
      <div className="min-w-0">
        <p className="text-gray-200 text-sm font-medium truncate">{programme.title}</p>
        {programme.description && (
          <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{programme.description}</p>
        )}
      </div>
    </div>
  )
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
