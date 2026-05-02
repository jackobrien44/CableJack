import { createContext, type ReactNode } from 'react'
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

export function PlatformProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformContext.Provider value={{ platform, isTV, isTizen, isWebOS }}>
      {children}
    </PlatformContext.Provider>
  )
}
