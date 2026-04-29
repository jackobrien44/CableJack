import { useEffect } from 'react'
import { streamsApi } from '../api/streams'

export function useStopStreamsOnExit() {
  useEffect(() => {
    // Stop any streams left over from a previous session
    streamsApi.stopAll().catch(() => {})

    function handleBeforeUnload() {
      const token = localStorage.getItem('accessToken')
      if (!token) return
      // keepalive ensures the request completes even as the page unloads
      fetch('/api/streams/stop-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        keepalive: true,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])
}
