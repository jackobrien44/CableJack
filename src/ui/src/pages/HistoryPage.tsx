import { useQuery } from '@tanstack/react-query'
import { userApi } from '../api/user'

export default function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => userApi.getHistory(),
  })

  if (isLoading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-white mb-6">Watch History</h1>

      {!data?.items.length && (
        <p className="text-gray-500 text-sm">No history yet.</p>
      )}

      <div className="space-y-2 max-w-xl">
        {data?.items.map(entry => (
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
