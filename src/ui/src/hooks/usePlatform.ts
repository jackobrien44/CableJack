import { useContext } from 'react'
import { PlatformContext, type PlatformContextValue } from '../context/platformContextDef'

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext)
}
