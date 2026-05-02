import { type ReactNode } from 'react'
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation'

interface FocusableRowProps {
  children: ReactNode
  focusKey?: string
  className?: string
}

/**
 * A horizontal container whose children participate in spatial navigation.
 * Remembers which child was last focused so returning to the row restores
 * focus to the correct item rather than always jumping to the first.
 */
export function FocusableRow({ children, focusKey, className = '' }: FocusableRowProps) {
  const { ref, focusKey: currentFocusKey } = useFocusable<HTMLDivElement>({
    focusKey,
    trackChildren: true,
    saveLastFocusedChild: true,
  })

  return (
    <FocusContext.Provider value={currentFocusKey}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </FocusContext.Provider>
  )
}
