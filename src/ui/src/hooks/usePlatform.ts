import { useContext } from 'react'
import { PlatformContext, type PlatformContextValue } from '../context/PlatformContext'

export function usePlatform(): PlatformContextValue {
  return useContext(PlatformContext)
}
