import { useInfiniteQuery } from '@tanstack/react-query'
import { userApi } from '../api/user'

export default function HistoryPage() {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['history'],
    queryFn: ({ pageParam = 1 }) => userApi.getHistory(pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasNextPage ? last.page + 1 : undefined,
  })

  const entries = data?.pages.flatMap(p => p.items) ?? []

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Watch History</h1>

      {entries.length === 0 && (
        <p className="text-gray-500 text-sm">No history yet.</p>
      )}

      <div className="space-y-2 max-w-xl">
        {entries.map(entry => (
          <div key={entry.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">{entry.channelName}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {new Date(entry.startedAt).toLocaleString()}
                {entry.stoppedAt && ` · ${formatDuration(entry.startedAt, entry.stoppedAt)}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm px-6 py-2 rounded-lg transition-colors"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
