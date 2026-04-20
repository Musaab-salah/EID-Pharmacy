/**
 * Aligns with Vite `base`: default /admin/; production Vercel build uses / (root).
 */
const _trim = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
let appBasePath = _trim === '/' ? '' : _trim

// If the bundle was built with base `/` but the page is served under /admin/ (e.g. proxy),
// still set basename so "/admin/" resolves to route "/".
if (
  appBasePath === '' &&
  typeof window !== 'undefined' &&
  /^\/admin(\/|$)/.test(window.location.pathname)
) {
  appBasePath = '/admin'
}

export const viteBase = appBasePath ? `${appBasePath}/` : '/'

/** Path prefix without trailing slash; empty when app is at site root. */
export { appBasePath }

/** React Router `basename` — omit when app lives at domain root. */
export const routerBasename = appBasePath === '' ? undefined : appBasePath

/** Login URL for 401 redirects */
export const loginHref = `${viteBase}login`.replace(/([^:]\/)\/+/g, '$1')

/**
 * Notification links from API may use /admin/...; strip prefix for navigate().
 */
export function stripAdminLinkPrefix(link: string): string {
  if (!link) return '/'
  const withBase = appBasePath
    ? link.replace(new RegExp(`^${escapeRe(appBasePath)}`), '')
    : link.replace(/^\/admin/, '')
  return withBase || '/'
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
