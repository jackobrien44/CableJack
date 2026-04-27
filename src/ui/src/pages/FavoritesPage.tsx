import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/user'
import { ChannelCard } from '../components/ChannelCard'
import { useStartStream } from '../hooks/useStartStream'

export default function FavoritesPage() {
  const queryClient = useQueryClient()

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })

  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const startStream = useStartStream()

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Favorites</h1>

      {!favorites?.length && (
        <p className="text-gray-500 text-sm">No favorites yet. Star a channel to add it here.</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {favorites?.map(channel => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            isFavorite={true}
            onPlay={() => startStream.mutate(channel.id)}
            onToggleFavorite={() => removeFavorite.mutate(channel.id)}
            isStarting={startStream.isPending && startStream.variables === channel.id}
          />
        ))}
      </div>
    </div>
  )
}
