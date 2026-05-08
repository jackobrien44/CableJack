import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import Hls from 'hls.js'
import { streamsApi } from '../api/streams'
import { epgApi } from '../api/epg'
import type { ProgrammeResponse } from '../types/api'
import { usePlatform } from '../hooks/usePlatform'
import { useBilling } from '../hooks/useBilling'

const CONTROLS_HIDE_MS = 4000

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { isTV } = usePlatform()
  const { canWatch } = useBilling()

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
  const [resolution, setResolution] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isAtLive, setIsAtLive] = useState(true)
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!canWatch) navigate(`/channels/${channelId}`, { replace: true })
  }, [canWatch, channelId, navigate])

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

  const streamUrl = stream?.status === 'Running' && stream.url ? stream.url : undefined

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    hlsRef.current?.destroy()
    hlsRef.current = null

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari — native HLS
      video.src = streamUrl
      video.play().catch(() => {})
    } else if (Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: 4 })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level]
        setResolution(level?.height ? `${level.height}p` : null)
      })
      hlsRef.current = hls
    }

    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [streamUrl])

  // Poll live edge every 2s to detect drift
  useEffect(() => {
    if (!streamUrl) return
    const interval = setInterval(() => {
      const video = videoRef.current
      if (!video) return
      const hls = hlsRef.current
      const liveEdge = hls
        ? (hls.liveSyncPosition ?? null)
        : video.seekable.length > 0 ? video.seekable.end(video.seekable.length - 1) : null
      if (liveEdge === null) return
      setIsAtLive(liveEdge - video.currentTime < 15)
    }, 2000)
    return () => clearInterval(interval)
  }, [streamUrl])

  const jumpToLive = useCallback(() => {
    const video = videoRef.current
    const hls = hlsRef.current
    const liveEdge = hls
      ? (hls.liveSyncPosition ?? null)
      : video && video.seekable.length > 0 ? video.seekable.end(video.seekable.length - 1) : null
    if (video && liveEdge !== null) video.currentTime = liveEdge
    setIsAtLive(true)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current
    const video = videoRef.current
    if (!player || !video) return
    if (!document.fullscreenElement) {
      if (player.requestFullscreen) player.requestFullscreen()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if ((video as any).webkitEnterFullscreen) (video as any).webkitEnterFullscreen()
    } else {
      document.exitFullscreen()
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const revealControls = useCallback(() => {
    setShowControls(true)
    if (controlsTimer.current) clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS)
  }, [])

  function handleExit() {
    if (streamId !== null) stop.mutate()
    else { cancelledRef.current = true; goBack() }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') handleExit()
      else if (e.key === 'i' || e.key === 'I') setShowSidebar(v => !v)
      else if ((e.key === 'r' || e.key === 'R') && stream?.status === 'Error' && !retry.isPending) retry.mutate()

      if (isTV) {
        revealControls()
        const video = videoRef.current
        if (!video) return
        if (e.key === 'Enter' || e.key === 'MediaPlayPause') {
          e.preventDefault()
          if (video.paused) video.play().catch(() => {}); else video.pause()
        } else if (e.key === 'MediaPlay') {
          e.preventDefault()
          video.play().catch(() => {})
        } else if (e.key === 'MediaPause' || e.key === 'MediaStop') {
          e.preventDefault()
          video.pause()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const upcomingList = upcoming?.filter(p => p.id !== nowPlaying?.id) ?? []
  const isRunning = stream?.status === 'Running' && !!stream?.url
  const isStarting = startError == null && (streamId == null || stream?.status === 'Starting')

  return (
    <div ref={playerRef} className={`flex bg-gray-950 h-svh overflow-hidden ${isTV ? '' : 'flex-col md:flex-row'}`}>

      {/* Player column */}
      <div
        className={`relative bg-black ${isTV ? 'h-svh w-full' : 'flex-1 h-[45svh] md:h-svh'}`}
        onClick={revealControls}
        onMouseMove={isTV ? undefined : revealControls}
      >
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

        {/* playsInline prevents iOS Safari from auto-fullscreening */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onPause={() => {
            if (!isRunning) return
            ffmpegPaused.current = true
            pause.mutate()
          }}
          onPlay={() => {
            if (!ffmpegPaused.current) return
            ffmpegPaused.current = false
            resume.mutate()
          }}
        />

        {/* Buffering spinner */}
        {isBuffering && !isStarting && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Controls overlay */}
        <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          {/* Top bar */}
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-4 pt-3 pb-8 flex items-center gap-3 pointer-events-auto">
            <button
              onClick={handleExit}
              disabled={stop.isPending}
              className="text-white hover:text-gray-300 transition-colors p-1"
              aria-label="Exit"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
            <span className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold rounded transition-colors ${isAtLive ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'}`}>
              {isAtLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              LIVE
            </span>
            {!isAtLive && (
              <button
                onClick={jumpToLive}
                className="text-xs text-white bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded transition-colors"
              >
                Jump to live
              </button>
            )}
            {resolution && <span className="text-gray-300 text-xs">{resolution}</span>}
          </div>

          {/* Bottom bar */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 flex items-center justify-end gap-3 pointer-events-auto">
            <button
              onClick={() => setShowSidebar(v => !v)}
              className="text-white hover:text-gray-300 transition-colors p-1"
              aria-label={showSidebar ? 'Hide info' : 'Show info'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                {showSidebar
                  ? <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm6 9.59L14.59 12 9 6.41 7.59 7.83 11.17 12l-3.58 4.17L9 17.59z"/>
                  : <path d="M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z"/>
                }
              </svg>
            </button>
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors p-1"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                {isFullscreen
                  ? <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                  : <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                }
              </svg>
            </button>
          </div>
        </div>

        {/* TV: bottom info bar */}
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
