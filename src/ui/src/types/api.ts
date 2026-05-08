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
  isChatEnabled: boolean
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
  createdAt: string
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
  channelLogoUrl: string | null
  title: string
  description: string | null
  startTime: string
  endTime: string
}

export interface WatchHistoryResponse {
  id: number
  channelId: number
  channelName: string
  channelLogoUrl: string | null
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
  paymentsEnabled: boolean
  paymentsEnforced: boolean
  stripePublishableKey: string | null
  stripePriceId: string | null
}

export type SubscriptionStatus = 'None' | 'Trialing' | 'Active' | 'PastDue' | 'Canceled' | 'Unpaid'

export interface UserBillingDto {
  userId: number
  username: string
  status: SubscriptionStatus
  freeAccess: boolean
  freeAccessReason: string | null
  trialExpiresAt: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

export interface AccessCheckResult {
  hasAccess: boolean
  isOnTrial: boolean
  isFreeAccess: boolean
  isSubscribed: boolean
  enforcementActive: boolean
  trialExpiresAt: string | null
  currentPeriodEnd: string | null
  hasStripeCustomer: boolean
}

export interface ImportResult {
  channelsCreated: number
  channelsUpdated: number
  channelsSkipped: number
  categoriesCreated: number
  errors: string[]
}
