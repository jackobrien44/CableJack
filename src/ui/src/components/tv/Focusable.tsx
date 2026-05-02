import { type ReactNode } from 'react'
import { useFocusable } from '@noriginmedia/norigin-spatial-navigation'

interface FocusableProps {
  children: ReactNode
  focusKey?: string
  onEnterPress?: () => void
  onFocus?: () => void
  className?: string
  focusClassName?: string
}

/**
 * Wraps any content and registers it with the spatial navigation system.
 * On TV, shows a violet focus ring when this element holds focus.
 * On non-TV devices, renders children as-is with no overhead.
 */
export function Focusable({
  children,
  focusKey,
  onEnterPress,
  onFocus,
  className = '',
  focusClassName = 'ring-2 ring-violet-400 ring-offset-2 ring-offset-gray-900 rounded-2xl',
}: FocusableProps) {
  const { ref, focused } = useFocusable<HTMLDivElement>({ focusKey, onEnterPress, onFocus })

  return (
    <div ref={ref} className={`${className} ${focused ? focusClassName : ''}`.trim()}>
      {children}
    </div>
  )
}
