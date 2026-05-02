import { createContext } from 'react'
import { platform, isTV, isTizen, isWebOS, type TVPlatform } from '../utils/platform'

export interface PlatformContextValue {
  platform: TVPlatform
  isTV: boolean
  isTizen: boolean
  isWebOS: boolean
}

export const PlatformContext = createContext<PlatformContextValue>({
  platform,
  isTV,
  isTizen,
  isWebOS,
})
