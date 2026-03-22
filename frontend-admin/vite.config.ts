import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On Vercel, serve at site root so https://xxx.vercel.app/ works.
// Locally keep /admin to match README and same-origin dev with Django.
export default defineConfig({
  plugins: [react()],
  base: process.env.VERCEL ? '/' : '/admin/',
  server: {
    port: 5173,
  },
})
