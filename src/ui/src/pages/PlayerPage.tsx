import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Hls from 'hls.js'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { streamsApi } from '../api/streams'
import { epgApi } from '../api/epg'

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

  const stop = useMutation({
    mutationFn: () => streamsApi.stop(streamId!),
    onSuccess: () => navigate('/'),
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
        console.warn('[hls] error', data.type, data.details, data.fatal, data)
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.warn('[hls] attempting media error recovery')
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

  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <div className="relative w-full bg-black" style={{ aspectRatio: '16/9', maxHeight: '75vh' }}>
        {(startError == null && streamId == null) || stream?.status === 'Starting' ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Starting stream…
          </div>
        ) : null}
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
      </div>

      <div className="p-5 flex items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-xs mb-2 transition-colors">
            ← Back to channels
          </button>
          <h2 className="text-white font-semibold text-lg">{stream?.channelName ?? '…'}</h2>
          {nowPlaying && (
            <div className="mt-1">
              <p className="text-gray-300 text-sm">{nowPlaying.title}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {fmtTime(nowPlaying.startTime)} – {fmtTime(nowPlaying.endTime)}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          {!paused ? (
            <button
              onClick={() => pause.mutate()}
              disabled={pause.isPending || stream?.status !== 'Running'}
              className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Pause
            </button>
          ) : (
            <button
              onClick={() => resume.mutate()}
              disabled={resume.isPending}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Resume
            </button>
          )}
          <button
            onClick={() => stop.mutate()}
            disabled={stop.isPending || streamId === null}
            className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  )
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
