import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/user'
import { streamsApi } from '../api/streams'

export default function FavoritesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })

  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const startStream = useMutation({
    mutationFn: (channelId: number) => streamsApi.start(channelId),
    onSuccess: (stream) => navigate(`/player/${stream.id}`),
  })

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Favorites</h1>

      {!favorites?.length && (
        <p className="text-gray-500 text-sm">No favorites yet. Star a channel to add it here.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {favorites?.map(channel => (
          <div key={channel.id} className="bg-gray-800 rounded-xl overflow-hidden group relative">
            <button
              onClick={() => startStream.mutate(channel.id)}
              disabled={startStream.isPending && startStream.variables === channel.id}
              className="w-full aspect-video bg-gray-900 flex items-center justify-center relative overflow-hidden"
            >
              {channel.logoUrl ? (
                <img src={channel.logoUrl} alt={channel.name} className="max-w-full max-h-full object-contain p-3" />
              ) : (
                <span className="text-gray-600 text-3xl">📺</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-2xl">▶</span>
              </div>
            </button>

            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-white text-xs font-medium truncate">{channel.name}</span>
              <button
                onClick={() => removeFavorite.mutate(channel.id)}
                className="text-yellow-400 hover:text-gray-500 text-sm shrink-0 transition-colors"
              >
                ★
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
