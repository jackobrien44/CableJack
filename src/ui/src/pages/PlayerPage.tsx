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
  const [paused, setPaused] = useState(false)
  const [hlsError, setHlsError] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSchedule, setShowSchedule] = useState(true)

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

  const pause = useMutation({
    mutationFn: () => streamsApi.pause(streamId!),
    onSuccess: () => setPaused(true),
  })

  const resume = useMutation({
    mutationFn: () => streamsApi.resume(streamId!),
    onSuccess: () => setPaused(false),
  })

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
      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url
      video.play().catch(() => {})
    }
  }, [stream?.url, stream?.status])

  const upcomingList = upcoming?.filter(p => p.id !== nowPlaying?.id) ?? []
  const allHidden = !showSidebar && !showSchedule

  return (
    <div className={`flex flex-col bg-gray-950 ${allHidden ? 'min-h-svh' : ''}`}>

      {/* Video row */}
      <div className="flex flex-col lg:flex-row lg:items-start">

        {/* Video */}
        <div
          className={`relative bg-black ${allHidden ? 'flex-1' : showSidebar ? 'lg:flex-1' : 'w-full'}`}
          style={allHidden ? { minHeight: '100svh' } : { aspectRatio: '16/9' }}
        >
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

          {/* Toggle buttons overlay */}
          <div className="absolute top-2 right-2 flex gap-1">
            <ToggleButton active={showSidebar} onClick={() => setShowSidebar(v => !v)} label="Info" />
            <ToggleButton active={showSchedule} onClick={() => setShowSchedule(v => !v)} label="Schedule" />
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="lg:w-80 xl:w-96 flex flex-col p-5 gap-4">
            <button onClick={() => navigate(-1)} className="self-start text-gray-500 hover:text-white text-xs transition-colors">
              ← Back to channels
            </button>

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

            <div className="flex gap-2 pt-2">
              {!paused ? (
                <button
                  onClick={() => pause.mutate()}
                  disabled={pause.isPending || stream?.status !== 'Running'}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  onClick={() => resume.mutate()}
                  disabled={resume.isPending}
                  className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Resume
                </button>
              )}
              <button
                onClick={() => stop.mutate()}
                disabled={stop.isPending || streamId === null}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Back / controls strip when sidebar is hidden */}
      {!showSidebar && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
          <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white text-xs transition-colors">
            ← Back to channels
          </button>
          <div className="flex gap-2">
            {!paused ? (
              <button
                onClick={() => pause.mutate()}
                disabled={pause.isPending || stream?.status !== 'Running'}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={() => resume.mutate()}
                disabled={resume.isPending}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
              >
                Resume
              </button>
            )}
            <button
              onClick={() => stop.mutate()}
              disabled={stop.isPending || streamId === null}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Upcoming schedule */}
      {showSchedule && upcomingList.length > 0 && (
        <div className="border-t border-gray-800">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider px-5 py-3">Up Next</h3>
          <div className="overflow-y-auto max-h-72 divide-y divide-gray-800">
            {upcomingList.map(p => <ScheduleRow key={p.id} programme={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded transition-colors ${
        active ? 'bg-black/60 text-white' : 'bg-black/30 text-gray-500 hover:text-white'
      }`}
    >
      {label}
    </button>
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
