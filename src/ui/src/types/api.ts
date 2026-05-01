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
  maxConcurrentStreams: number
  expiresAt: string | null
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
  startedAt: string
}

export interface DashboardStatsDto {
  activeStreams: number
  totalUsers: number
  totalChannels: number
  streamsLast24h: number
  errorsLast24h: number
  newUsersLast7d: number
}

export interface WatchSessionDto {
  id: number
  userId: number
  username: string
  channelName: string
  startedAt: string
  stoppedAt: string | null
}

export interface TopChannelDto {
  channelName: string
  sessionCount: number
  totalMinutes: number
}

export interface UserStatDto {
  userId: number
  username: string
  isActive: boolean
  activeStreams: number
  totalSessions: number
  totalMinutes: number
  lastLoginAt: string | null
  createdAt: string
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

export interface UserStatsDto {
  favoriteCount: number
  historyCount: number
  totalWatchSeconds: number
}

export interface AuditLogDto {
  id: number
  timestamp: string
  action: string
  actorId: number | null
  actorUsername: string | null
  targetType: string | null
  targetId: number | null
  description: string | null
  ipAddress: string | null
}

export interface SystemSettingsDto {
  registrationMode: 'Open' | 'InviteOnly' | 'Disabled'
  maxConcurrentStreams: number
}

export interface ImportResult {
  channelsCreated: number
  channelsUpdated: number
  channelsSkipped: number
  categoriesCreated: number
  errors: string[]
}
