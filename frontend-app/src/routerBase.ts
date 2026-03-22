/**
 * Aligns with Vite `base`: local dev uses /app/; Vercel production uses / (root).
 */
export const viteBase = import.meta.env.BASE_URL

export const appBasePath = viteBase.replace(/\/+$/, '')

export const routerBasename =
  !appBasePath || appBasePath === '/' ? undefined : appBasePath

export const loginHref = `${viteBase}login`.replace(/([^:]\/)\/+/g, '$1')

export function stripAppLinkPrefix(link: string): string {
  if (!link) return '/'
  const withBase = appBasePath
    ? link.replace(new RegExp(`^${escapeRe(appBasePath)}`), '')
    : link.replace(/^\/app/, '')
  return withBase || '/'
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
