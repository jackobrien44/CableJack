import { Link } from 'react-router-dom'
import type { ChannelResponse } from '../types/api'
import { httpsUrl } from '../utils/url'

interface ChannelRowProps {
  channel: ChannelResponse
  isFavorite: boolean
  onPlay: () => void
  onToggleFavorite: () => void
  isStarting?: boolean
}

export function ChannelRow({ channel, isFavorite, onPlay, onToggleFavorite, isStarting }: ChannelRowProps) {
  return (
    <div
      onClick={isStarting ? undefined : onPlay}
      className={`flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2 transition-colors group ${isStarting ? 'opacity-60 cursor-default' : 'hover:bg-gray-700 cursor-pointer'}`}
    >
      <div className="shrink-0 aspect-square w-12 flex items-center justify-center overflow-hidden rounded-lg">
        {channel.logoUrl ? (
          <img
            src={httpsUrl(channel.logoUrl)}
            alt={channel.name}
            className="w-full h-full object-contain p-1.5"
            style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.35)) drop-shadow(0 0 5px rgba(255,255,255,0.08))' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <span className="text-gray-600 text-xl">📺</span>
        )}
      </div>

      <Link
        to={`/channels/${channel.id}`}
        onClick={e => e.stopPropagation()}
        className="flex-1 min-w-0 text-white font-medium truncate hover:text-violet-300 transition-colors"
      >
        {channel.name}
      </Link>

      <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 group-hover:bg-violet-600 transition-colors text-white text-sm">
        {isStarting ? '…' : '▶'}
      </span>

      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite() }}
        className={`text-2xl shrink-0 px-2 py-1 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
      >
        ★
      </button>
    </div>
  )
}
