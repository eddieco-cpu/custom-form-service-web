/** Validate deployment configuration without logging the supplied URL. */
export function assertProductionApiBaseUrl(value: unknown): void {
  const invalid = () => new Error('NUXT_PUBLIC_API_BASE_URL must be an absolute HTTPS API URL without credentials, query, fragment, or a loopback host.')
  if (typeof value !== 'string' || value.trim() !== value || !value) throw invalid()
  let url: URL
  try {
    url = new URL(value)
  }
  catch {
    throw invalid()
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (url.protocol !== 'https:' || url.username || url.password || value.includes('?') || value.includes('#')
    || host === 'localhost' || host.endsWith('.localhost')
    || host === '0.0.0.0' || /^127\.\d+\.\d+\.\d+$/.test(host)
    || host === '[::]' || host === '[::1]' || /^\[::ffff:7f[0-9a-f]{2}:/.test(host)) throw invalid()
}
