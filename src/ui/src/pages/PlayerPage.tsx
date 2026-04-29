import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Hls from 'hls.js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { streamsApi } from '../api/streams'
import { epgApi } from '../api/epg'
import type { ProgrammeResponse } from '../types/api'

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const channelId = Number(id)
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const startedRef = useRef(false)
  const [streamId, setStreamId] = useState<number | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [hlsError, setHlsError] = useState<string | null>(null)
  const ffmpegPaused = useRef(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    streamsApi.start(channelId)
      .then(s => setStreamId(s.id))
      .catch(() => setStartError('Failed to start stream.'))
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
    const url = stream?.url
    const video = videoRef.current
    if (!url || !video || stream?.status !== 'Running') return

    setHlsError(null)

    if (Hls.isSupported()) {
      const hls = new Hls({
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1000,
        liveDurationInfinity: true,
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsError(null)
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else {
          setHlsError('Failed to load stream. The source may be unavailable.')
        }
      })
      function onPause() {
        ffmpegPaused.current = true
        pause.mutate()
      }
      function onPlay() {
        if (!ffmpegPaused.current) return
        ffmpegPaused.current = false
        resume.mutate()
      }
      video.addEventListener('pause', onPause)
      video.addEventListener('play', onPlay)

      return () => {
        hls.destroy()
        hlsRef.current = null
        video.removeEventListener('pause', onPause)
        video.removeEventListener('play', onPlay)
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
    }
  }, [stream?.url, stream?.status])

  function handleVideoMouseMove() {
    setControlsVisible(true)
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current)
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }

  const upcomingList = upcoming?.filter(p => p.id !== nowPlaying?.id) ?? []
  const hasSchedule = upcomingList.length > 0

  return (
    <div className="flex flex-col bg-gray-950 min-h-svh">

      {/* Video + sidebar row */}
      <div className="flex flex-col lg:flex-row lg:items-start">

        {/* Video + schedule-toggle column */}
        <div className={`flex flex-col ${showSidebar ? 'lg:flex-1' : 'w-full'}`}>

          {/* Video */}
          <div className="relative bg-black" style={{ aspectRatio: '16/9' }} onMouseMove={handleVideoMouseMove} onMouseLeave={() => setControlsVisible(false)}>
            {((startError == null && streamId == null) || stream?.status === 'Starting') && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                Starting stream…
              </div>
            )}
            {stream?.status === 'Error' && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
                Stream error. The source may be unavailable.
              </div>
            )}
            {startError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
                {startError}
              </div>
            )}
            {hlsError && (
              <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm px-8 text-center">
                {hlsError}
              </div>
            )}
            <video ref={videoRef} className="w-full h-full" controls playsInline />

            {/* Stop / back button */}
            <button
              onClick={() => stop.mutate()}
              disabled={stop.isPending}
              className={`absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-sm bg-black/60 hover:bg-black/90 text-white text-xl leading-none transition-opacity disabled:opacity-40 backdrop-blur-sm ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              title="Stop and go back"
            >
              ✕
            </button>

            {/* Info button — above pause, only when sidebar hidden */}
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className={`absolute bottom-14 left-3 w-9 h-9 flex items-center justify-center rounded-sm bg-black/60 hover:bg-black/90 text-white text-xs leading-none transition-opacity backdrop-blur-sm ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              >
                Info
              </button>
            )}
          </div>

          {/* Schedule toggle bar */}
          {hasSchedule && (
            <button
              onClick={() => setShowSchedule(v => !v)}
              className="flex items-center justify-between px-5 py-2.5 border-t border-gray-800 hover:bg-gray-900 transition-colors text-left w-full"
            >
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Up Next</span>
              <span className="text-gray-600 text-xs">{showSchedule ? '▲' : '▼'}</span>
            </button>
          )}

          {/* Schedule */}
          {showSchedule && hasSchedule && (
            <div className="overflow-y-auto max-h-72 divide-y divide-gray-800 border-b border-gray-800">
              {upcomingList.map(p => <ScheduleRow key={p.id} programme={p} />)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="lg:w-80 xl:w-96 flex flex-col border-l border-gray-800">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
              <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white text-xs transition-colors">
                ← Back
              </button>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-gray-500 hover:text-white text-xs transition-colors"
              >
                Hide info ›
              </button>
            </div>

            <div className="flex flex-col p-5 gap-4">
              <div>
                <h2 className="text-white font-semibold text-lg">{stream?.channelName ?? '…'}</h2>
                {nowPlaying ? (
                  <div className="mt-2">
                    <p className="text-gray-200 text-sm font-medium">{nowPlaying.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {fmtTime(nowPlaying.startTime)} – {fmtTime(nowPlaying.endTime)}
                    </p>
                    {nowPlaying.description && (
                      <p className="text-gray-400 text-sm mt-2 leading-relaxed">{nowPlaying.description}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm mt-1">No EPG data</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
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
