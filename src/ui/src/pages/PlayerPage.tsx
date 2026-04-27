import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Hls from 'hls.js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { streamsApi } from '../api/streams'
import { epgApi } from '../api/epg'

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const streamId = Number(id)
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [paused, setPaused] = useState(false)
  const [hlsError, setHlsError] = useState<string | null>(null)

  const { data: stream } = useQuery({
    queryKey: ['stream', streamId],
    queryFn: () => streamsApi.getById(streamId),
    // Poll while starting or running — stops once stopped/errored
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'Starting' || status === 'Running' ? 2000 : false
    },
  })

  const { data: nowPlaying } = useQuery({
    queryKey: ['epg-now', stream?.channelId],
    queryFn: () => epgApi.getNowPlaying(stream!.channelId),
    enabled: !!stream?.channelId,
    refetchInterval: 60_000,
  })

  const stop = useMutation({
    mutationFn: () => streamsApi.stop(streamId),
    onSuccess: () => navigate('/'),
  })

  const pause = useMutation({
    mutationFn: () => streamsApi.pause(streamId),
    onSuccess: () => setPaused(true),
  })

  const resume = useMutation({
    mutationFn: () => streamsApi.resume(streamId),
    onSuccess: () => setPaused(false),
  })

  useEffect(() => {
    const url = stream?.url
    const video = videoRef.current
    if (!url || !video || stream?.status !== 'Running') return

    setHlsError(null)

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Retry manifest load a few times while ffmpeg buffers up the first segments
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1000,
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsError(null)
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
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

  const isBuffering = stream?.status === 'Starting' || stream?.status === 'Running' && !hlsRef.current?.media

  return (
    <div className="flex flex-col min-h-svh bg-gray-950">
      <div className="relative w-full bg-black" style={{ aspectRatio: '16/9', maxHeight: '75vh' }}>
        {stream?.status === 'Starting' && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Starting stream…
          </div>
        )}
        {stream?.status === 'Running' && !hlsError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
            <span className="opacity-0" id="buffering-hint">Buffering…</span>
          </div>
        )}
        {stream?.status === 'Error' && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
            Stream error. The source may be unavailable.
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
          <Link to="/" className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-xs mb-2 transition-colors">
            ← Back to channels
          </Link>
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
            disabled={stop.isPending}
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
