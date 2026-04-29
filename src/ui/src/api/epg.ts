import { api } from './client'
import type { ProgrammeResponse } from '../types/api'

export const epgApi = {
  getProgrammes: (channelId: number, from?: string, to?: string) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return api.get<ProgrammeResponse[]>(`/epg/channels/${channelId}?${params}`)
  },

  getNowPlaying: (channelId: number) =>
    api.get<ProgrammeResponse>(`/epg/channels/${channelId}/now`),

  getAllNowPlaying: () => api.get<ProgrammeResponse[]>('/epg/now'),

  deleteAll: () => api.delete<{ deleted: number }>('/epg'),
}
