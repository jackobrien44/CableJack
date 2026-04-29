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
  const [page, setPage] = useState(1)

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })

  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const startStream = useStartStream()

  useEffect(() => {
    if (!gridEl) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const cols = Math.max(2, Math.floor((width + GAP) / (MIN_CARD_W + GAP)))
      const rows = Math.max(1, Math.floor((height + GAP) / (MIN_CARD_H + GAP)))
      setGridDims(prev => prev.cols === cols && prev.rows === rows ? prev : { cols, rows })
      setPage(1)
    })
    ro.observe(gridEl)
    return () => ro.disconnect()
  }, [gridEl])

  const pageSize = gridDims.cols * gridDims.rows
  const all = favorites ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const slice = all.slice((safePage - 1) * pageSize, safePage * pageSize)

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6">
      <h1 className="text-xl font-semibold text-white pt-6 pb-4 shrink-0">Favorites</h1>

      {!all.length && (
        <p className="text-gray-500 text-sm">No favorites yet. Star a channel to add it here.</p>
      )}

      {!!all.length && (
        <div ref={setGridEl} className="flex-1 min-h-0 overflow-hidden pb-3">
          <div
            className="h-full grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridDims.cols}, 1fr)`,
              gridTemplateRows: `repeat(${gridDims.rows}, 1fr)`,
            }}
          >
            {slice.map(channel => (
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

      {totalPages > 1 && (
        <div className="py-3 flex items-center justify-center gap-0.5 sm:gap-1 shrink-0">
          <PageButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>‹</PageButton>
          {pageNumbers(safePage, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
            ) : (
              <PageButton key={p} onClick={() => setPage(p as number)} active={p === safePage}>{p}</PageButton>
            )
          )}
          <PageButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>›</PageButton>
        </div>
      )}
    </div>
  )
}

function PageButton({ onClick, disabled, active, children }: {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[1.75rem] h-8 px-1 sm:min-w-[2.25rem] sm:h-9 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-30 ${
        active
          ? 'bg-violet-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
