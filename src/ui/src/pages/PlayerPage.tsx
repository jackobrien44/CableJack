import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { MediaPlayer, MediaProvider, isHLSProvider } from '@vidstack/react'
import type { MediaPlayerInstance } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import '@vidstack/react/player/styles/default/theme.css'
import '@vidstack/react/player/styles/default/layouts/video.css'
import { streamsApi } from '../api/streams'
import { epgApi } from '../api/epg'
import type { ProgrammeResponse } from '../types/api'
import { usePlatform } from '../hooks/usePlatform'

const CONTROLS_HIDE_MS = 4000

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { isTV } = usePlatform()

  function goBack() {
    if (location.key !== 'default') navigate(-1)
    else navigate('/', { replace: true })
  }
  const startedRef = useRef(false)
  const cancelledRef = useRef(false)
  const [streamId, setStreamId] = useState<number | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const ffmpegPaused = useRef(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const playerRef = useRef<MediaPlayerInstance>(null)
  const [resolution, setResolution] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(false)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const revealControls = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS)
  }, [])

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
    onSettled: () => goBack(),
  })

  const retry = useMutation({
    mutationFn: async () => {
      await streamsApi.stop(streamId!)
      return streamsApi.start(channelId)
    },
    onSuccess: s => setStreamId(s.id),
  })

  const pause = useMutation({ mutationFn: () => streamsApi.pause(streamId!) })
  const resume = useMutation({ mutationFn: () => streamsApi.resume(streamId!) })

  useEffect(() => {
    return playerRef.current?.subscribe(({ quality }) => {
      setResolution(quality?.height ? `${quality.height}p` : null)
    })
  }, [])

  const upcomingList = upcoming?.filter(p => p.id !== nowPlaying?.id) ?? []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') handleExit()
      else if (e.key === 'i' || e.key === 'I') setShowSidebar(v => !v)
      else if ((e.key === 'r' || e.key === 'R') && stream?.status === 'Error' && !retry.isPending) retry.mutate()

      if (isTV) {
        revealControls()
        const player = playerRef.current
        if (!player) return
        if (e.key === 'Enter' || e.key === 'MediaPlayPause') {
          e.preventDefault()
          player.paused ? player.play().catch(() => {}) : player.pause()
        } else if (e.key === 'MediaPlay') {
          e.preventDefault()
          player.play().catch(() => {})
        } else if (e.key === 'MediaPause' || e.key === 'MediaStop') {
          e.preventDefault()
          player.pause()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const isRunning = stream?.status === 'Running' && !!stream?.url
  const isStarting = (startError == null && streamId == null) || stream?.status === 'Starting'

  // Stable object reference — only changes when the URL actually changes.
  // Without this, every 2s poll creates a new object and Vidstack reinitialises
  // HLS.js, causing segment0000.ts to repeat and play() to be aborted.
  const mediaSrc = useMemo(
    () => isRunning ? { src: stream!.url, type: 'application/x-mpegurl' as const } : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isRunning, stream?.url]
  )

  function handleExit() {
    if (streamId !== null) {
      stop.mutate()
    } else {
      cancelledRef.current = true
      goBack()
    }
  }

  return (
    <div className={`flex bg-gray-950 h-svh overflow-hidden ${isTV ? '' : 'flex-col md:flex-row'}`}>

      {/* Player column */}
      <div className={`relative bg-black ${isTV ? 'h-svh w-full' : 'flex-1 h-[45svh] md:h-svh'}`}>

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
            <div className="flex gap-2">
              <button
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
                className="text-white text-xs px-3 py-1.5 rounded-lg border border-violet-600 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                {retry.isPending ? 'Retrying…' : 'Retry'}
              </button>
              <button
                onClick={handleExit}
                disabled={stop.isPending}
                className="text-gray-500 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"
              >
                Go back
              </button>
            </div>
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
          src={mediaSrc}
          minLiveDVRWindow={30}
          className="w-full h-full dark"
          onProviderSetup={provider => {
            if (isHLSProvider(provider)) {
              provider.config = { liveSyncDurationCount: 4 }
            }
          }}
          onCanPlay={() => { playerRef.current?.play().catch(() => {}) }}
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
                  onClick={handleExit}
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

        {/* TV: bottom info bar — channel name + now playing, fades after inactivity */}
        {isTV && showControls && (
          <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none bg-gradient-to-t from-black/90 via-black/50 to-transparent px-12 pb-10 pt-24">
            <p className="text-white text-4xl font-bold drop-shadow-lg">{stream?.channelName ?? '…'}</p>
            {nowPlaying && (
              <>
                <p className="text-gray-200 text-2xl mt-2">{nowPlaying.title}</p>
                <p className="text-gray-400 text-lg mt-1">{fmtTime(nowPlaying.startTime)} – {fmtTime(nowPlaying.endTime)}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className={isTV
          ? 'absolute right-0 top-0 z-30 h-full w-96 flex flex-col bg-gray-900/95 border-l border-gray-800 overflow-hidden'
          : 'w-full border-t md:w-80 xl:w-96 flex flex-col md:border-l md:border-t-0 border-gray-800 max-h-[55svh] md:max-h-none md:h-svh overflow-hidden'
        }>
          {/* Now playing */}
          <div className="px-5 py-4 border-b border-gray-800 shrink-0">
            <p className="text-white font-bold text-2xl mb-3">{stream?.channelName ?? '…'}</p>
            {nowPlaying ? (
              <>
                <p className="text-gray-200 text-base font-medium">{nowPlaying.title}</p>
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
              <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider px-5 py-3 shrink-0">Up Next</p>
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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
