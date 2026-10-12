import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The API serves this build from its own origin, so the dashboard calls /api
// relative to itself. In development Vite proxies /api and /w to the local API
// for the same effect. VITE_API_URL is only needed to host the build elsewhere.
export default defineConfig(() => {
  return {
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/w': 'http://localhost:8787',
    },
  },
  }
})
