import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/user'
import { ChannelCard } from '../components/ChannelCard'
import { useStartStream } from '../hooks/useStartStream'

const MIN_CARD_W = 220
const MIN_CARD_H = 240
const GAP = 12

export default function FavoritesPage() {
  const queryClient = useQueryClient()
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null)
  const [gridDims, setGridDims] = useState({ cols: 6, rows: 4 })

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })

  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const startStream = useStartStream()
  const hasFavorites = (favorites?.length ?? 0) > 0

  useEffect(() => {
    if (!gridEl) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const cols = Math.max(2, Math.floor((width + GAP) / (MIN_CARD_W + GAP)))
      const rows = Math.max(1, Math.floor((height + GAP) / (MIN_CARD_H + GAP)))
      setGridDims(prev => prev.cols === cols && prev.rows === rows ? prev : { cols, rows })
    })
    ro.observe(gridEl)
    return () => ro.disconnect()
  }, [gridEl])

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6">
      <h1 className="text-xl font-semibold text-white pt-6 pb-4 shrink-0">Favorites</h1>

      {!favorites?.length && (
        <p className="text-gray-500 text-sm">No favorites yet. Star a channel to add it here.</p>
      )}

      {!!favorites?.length && (
        <div ref={setGridEl} className="flex-1 min-h-0 overflow-hidden pb-6">
          <div
            className="h-full grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridDims.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridDims.rows}, 1fr)`,
            }}
          >
            {favorites.map(channel => (
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
      )}
    </div>
  )
}
