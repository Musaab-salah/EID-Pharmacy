/**
 * Aligns with Vite `base`: default /app/; production Vercel build uses / (root).
 */
const _trim = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
let appBasePath = _trim === '/' ? '' : _trim

if (
  appBasePath === '' &&
  typeof window !== 'undefined' &&
  /^\/app(\/|$)/.test(window.location.pathname)
) {
  appBasePath = '/app'
}

export const viteBase = appBasePath ? `${appBasePath}/` : '/'

export { appBasePath }

export const routerBasename = appBasePath === '' ? undefined : appBasePath

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
