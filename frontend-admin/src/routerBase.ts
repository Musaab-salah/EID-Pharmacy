/**
 * Aligns with Vite `base`: local dev uses /admin/; Vercel production uses / (root).
 */
export const viteBase = import.meta.env.BASE_URL

/** Path prefix without trailing slash; empty string when app is at site root. */
export const appBasePath = viteBase.replace(/\/+$/, '')

/** React Router `basename` — omit when app lives at domain root. */
export const routerBasename =
  !appBasePath || appBasePath === '/' ? undefined : appBasePath

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
