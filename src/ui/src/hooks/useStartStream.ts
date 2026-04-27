import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { streamsApi } from '../api/streams'

export function useStartStream() {
  const navigate = useNavigate()

  const { data: activeStreams } = useQuery({
    queryKey: ['my-streams'],
    queryFn: streamsApi.getMyStreams,
    staleTime: 5_000,
  })

  const startMutation = useMutation({
    mutationFn: (channelId: number) => {
      const existing = activeStreams?.find(
        s => s.channelId === channelId && (s.status === 'Running' || s.status === 'Starting'),
      )
      if (existing) return Promise.resolve(existing)
      return streamsApi.start(channelId)
    },
    onSuccess: (stream) => navigate(`/player/${stream.id}`),
  })

  return startMutation
}
