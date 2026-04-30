import { Link } from 'react-router-dom'
import type { ChannelResponse } from '../types/api'

interface ChannelCardProps {
  channel: ChannelResponse
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  isStarting?: boolean
}

export function ChannelCard({ channel, isFavorite, onPlay, onToggleFavorite, isStarting }: ChannelCardProps) {
  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-xl overflow-hidden group">
      <button
        onClick={onPlay}
        disabled={isStarting}
        className="flex-1 min-h-0 w-full bg-gray-900 flex items-center justify-center relative overflow-hidden"
      >
        {channel.logoUrl ? (
          <img
            src={channel.logoUrl}
            alt={channel.name}
            className="max-w-full max-h-full object-contain p-3"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <span className="text-gray-600 text-3xl">📺</span>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isStarting
            ? <span className="text-white text-sm">Starting…</span>
            : <span className="text-white text-2xl">▶</span>
          }
        </div>
      </button>

      <div className="px-3 py-3 flex items-center justify-between gap-2">
        <Link
          to={`/channels/${channel.id}`}
          className="text-white text-base font-medium truncate hover:text-violet-300 transition-colors"
        >
          {channel.name}
        </Link>
        <button
          onClick={onToggleFavorite}
          className={`text-2xl shrink-0 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
        >
          ★
        </button>
      </div>
    </div>
  )
}
