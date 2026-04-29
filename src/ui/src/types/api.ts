export interface PagedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresAt: string
  user: UserResponse
}

export interface UserResponse {
  id: number
  username: string
  isActive: boolean
  role: 'User' | 'Administrator'
  createdAt: string
  modifiedAt: string | null
}

export interface CategoryResponse {
  id: number
  name: string
  sortOrder: number
}

export interface ProviderResponse {
  id: number
  name: string
  baseUrl: string | null
  username: string | null
  password: string | null
}

export interface ChannelResponse {
  id: number
  name: string
  tvgId: string | null
  description: string | null
  sourceUrl: string
  logoUrl: string | null
  categoryId: number
  categoryName: string
  providerId: number | null
  providerName: string | null
  isActive: boolean
  sortOrder: number
}

export interface StreamResponse {
  id: number
  url: string
  status: 'Starting' | 'Running' | 'Paused' | 'Stopped' | 'Error'
  channelId: number
  channelName: string
  userId: number
  username: string | null
}

export interface DashboardStatsDto {
  activeStreams: number
  totalUsers: number
  totalChannels: number
}

export interface ProgrammeResponse {
  id: number
  channelId: number
  channelName: string
  title: string
  description: string | null
  startTime: string
  endTime: string
}

export interface WatchHistoryResponse {
  id: number
  channelId: number
  channelName: string
  startedAt: string
  stoppedAt: string | null
}

export interface SystemSettingsDto {
  registrationMode: 'Open' | 'InviteOnly' | 'Disabled'
}

export interface ImportResult {
  channelsCreated: number
  channelsUpdated: number
  channelsSkipped: number
  categoriesCreated: number
  errors: string[]
}
