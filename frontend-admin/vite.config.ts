import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Dev always uses /admin/ so /admin/ matches React Router even if VERCEL is set in the shell.
  // Production + VERCEL=1 (CI/Vercel build): site root for *.vercel.app.
  const siteRoot = mode === 'production' && process.env.VERCEL === '1'

  return {
    plugins: [react()],
    base: siteRoot ? '/' : '/admin/',
    server: {
      port: 5173,
      proxy: {
        '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/media': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
  }
})
