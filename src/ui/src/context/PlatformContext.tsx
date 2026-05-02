import { type ReactNode } from 'react'
import { platform, isTV, isTizen, isWebOS } from '../utils/platform'
import { PlatformContext } from './platformContextDef'

export function PlatformProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformContext.Provider value={{ platform, isTV, isTizen, isWebOS }}>
      {children}
    </PlatformContext.Provider>
  )
}
