export type TVPlatform = 'tizen' | 'webos' | null

function detectPlatform(): TVPlatform {
  const ua = navigator.userAgent

  if (ua.includes('Tizen') || 'tizen' in window) return 'tizen'
  if (ua.includes('Web0S') || ua.includes('webOS') || 'webOS' in window) return 'webos'

  return null
}

export const platform: TVPlatform = detectPlatform()
export const isTV = platform !== null
export const isTizen = platform === 'tizen'
export const isWebOS = platform === 'webos'

// Normalised remote key codes. Both Tizen and WebOS map their remote buttons
// to standard DOM key codes for the keys below, so a single set covers both.
export const TVKey = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  SELECT: 'Enter',
  BACK: 'Escape',       // WebOS: XF86Back also fires Escape in the browser
  PLAY_PAUSE: 'MediaPlayPause',
  PLAY: 'MediaPlay',
  PAUSE: 'MediaPause',
  STOP: 'MediaStop',
  REWIND: 'MediaRewind',
  FAST_FORWARD: 'MediaFastForward',
  CHANNEL_UP: 'ChannelUp',
  CHANNEL_DOWN: 'ChannelDown',
} as const

export type TVKeyValue = (typeof TVKey)[keyof typeof TVKey]
