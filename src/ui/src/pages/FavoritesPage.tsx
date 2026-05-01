import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userApi } from '../api/user'
import { ChannelRow } from '../components/ChannelRow'
import { useStartStream } from '../hooks/useStartStream'

const PAGE_SIZE = 50

export default function FavoritesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)

  function goToPage(p: number) {
    setPage(p)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { data: favorites, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  })

  const removeFavorite = useMutation({
    mutationFn: userApi.removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const startStream = useStartStream()

  const all = favorites ?? []
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const slice = all.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6">
      <h1 className="text-xl font-semibold text-white pt-6 pb-4 shrink-0">Favorites</h1>

      {!all.length && (
        <p className="text-gray-500 text-sm">No favorites yet. Star a channel to add it here.</p>
      )}

      {!!all.length && (
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto pb-3">
          <div className="flex flex-col gap-1.5">
            {slice.map(channel => (
              <ChannelRow
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
          <PageButton onClick={() => goToPage(Math.max(1, safePage - 1))} disabled={safePage === 1}>‹</PageButton>
          {pageNumbers(safePage, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-600">…</span>
            ) : (
              <PageButton key={p} onClick={() => goToPage(p as number)} active={p === safePage}>{p}</PageButton>
            )
          )}
          <PageButton onClick={() => goToPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages}>›</PageButton>
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
      className={`min-w-[2.5rem] h-10 px-1 sm:min-w-[2.25rem] sm:h-9 sm:px-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-30 ${
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
