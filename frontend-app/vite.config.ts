import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// See frontend-admin/vite.config.ts — dev always uses /app/; Vercel production build uses /.
export default defineConfig(({ mode }) => {
  const siteRoot = mode === 'production' && process.env.VERCEL === '1'

  return {
    plugins: [react()],
    base: siteRoot ? '/' : '/app/',
    server: {
      port: 5174,
      proxy: {
        '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
  }
})
