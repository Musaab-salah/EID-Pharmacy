/**
 * API base URL - configurable via VITE_API_URL for deployment.
 * - Dev: http://localhost:8000/api
 * - Same-origin (e.g. PythonAnywhere): /api (uses current domain)
 * - Cross-origin (e.g. Vercel + Render): set VITE_API_URL to full backend URL
 */
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api')

/** Base URL without /api - for media URLs and direct fetch calls */
export const API_BASE = API_URL.startsWith('http')
  ? API_URL.replace(/\/api\/?$/, '')
  : `${window.location.origin}${API_URL.replace(/\/api\/?$/, '') || ''}`
