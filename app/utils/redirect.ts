// Match only the explicit V1 routes; a catch-all must never grant a redirect.
export function safeRedirect(input: unknown, origin: string): string {
  if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//') || /[\\\s]/u.test(input)) return '/'
  try {
    const decoded = decodeURIComponent(input)
    // Reject decoded control characters before handing the path to the router.
    // eslint-disable-next-line no-control-regex
    if (decoded.includes('\\') || decoded.startsWith('//') || /[\u0000-\u001f\u007f]/u.test(decoded)) return '/'
    const url = new URL(input, origin)
    if (url.origin !== new URL(origin).origin || /%2f/iu.test(url.pathname)) return '/'
    const path = decodeURIComponent(url.pathname)
    if (!(/^\/$/u.test(path) || /^\/profile\/?$/u.test(path) || /^\/forms(?:\/(?:new|[^/]+(?:\/(?:edit|statistics))?))?\/?$/u.test(path))) return '/'
    return `${url.pathname}${url.search}${url.hash}`
  }
  catch { return '/' }
}
export const loginLocation = (fullPath: string) => ({ path: '/login', query: { redirect: fullPath } })
