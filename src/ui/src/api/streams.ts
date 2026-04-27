import { api } from './client'
import type { StreamResponse } from '../types/api'

export const streamsApi = {
  getMyStreams: () => api.get<StreamResponse[]>('/streams'),
  start: (channelId: number) => api.post<StreamResponse>('/streams', { channelId }),
  stop: (id: number) => api.put<StreamResponse>(`/streams/${id}/stop`),
  pause: (id: number) => api.put<StreamResponse>(`/streams/${id}/pause`),
  resume: (id: number) => api.put<StreamResponse>(`/streams/${id}/resume`),
  delete: (id: number) => api.delete<void>(`/streams/${id}`),
}
