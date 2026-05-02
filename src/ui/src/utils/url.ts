/** Coerce an HTTP image URL to HTTPS to avoid mixed-content blocks.
 *  Servers that don't support TLS will still fail, but onError handles that. */
export function httpsUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  return url.replace(/^http:\/\//i, 'https://')
}
