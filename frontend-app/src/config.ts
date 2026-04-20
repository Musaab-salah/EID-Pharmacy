/**
 * API base URL — must be set at build time for production (Vercel: Environment Variables).
 * Example: VITE_API_URL=https://your-api.onrender.com/api
 */
function resolveApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).trim().replace(/\/$/, '')
  }
  if (import.meta.env.DEV) {
    return '/api'
  }
  throw new Error(
    'VITE_API_URL is not set. For production builds, define it in .env.production or the host (e.g. https://api.example.com/api).',
  )
}

export const API_URL = resolveApiUrl()

/** Origin without /api — for media URLs and direct fetch */
export const API_BASE = API_URL.startsWith('http')
  ? API_URL.replace(/\/api\/?$/, '')
  : typeof window !== 'undefined'
    ? window.location.origin
    : ''
