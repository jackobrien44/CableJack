import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

export function useStartStream() {
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (channelId: number) => Promise.resolve(channelId),
    onSuccess: (channelId) => navigate(`/player/${channelId}`),
  })
}
