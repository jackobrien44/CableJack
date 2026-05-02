import { createContext, useContext, type ReactNode } from 'react'
import { platform, isTV, isTizen, isWebOS, type TVPlatform } from '../utils/platform'

interface PlatformContextValue {
  platform: TVPlatform
  isTV: boolean
  isTizen: boolean
  isWebOS: boolean
}

const PlatformContext = createContext<PlatformContextValue>({
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

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext)
}
