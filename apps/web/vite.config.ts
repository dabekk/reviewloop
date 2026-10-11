import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local dev serves from the root and proxies the API, so the dashboard and
// API share an origin. The production build targets the /reviewloop/ subpath
// this demo is deployed under on automatemonday.com, and calls the API at
// VITE_API_URL.
export default defineConfig(({ command, mode }) => {
  // A production build without an API URL would ship a dashboard that calls
  // /api on the static host. Fail the build instead.
  if (command === 'build' && !loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL) {
    throw new Error('Set VITE_API_URL (e.g. https://reviewloop-api.onrender.com) before building the web app.')
  }
  return {
  base: command === 'build' ? '/reviewloop/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/w': 'http://localhost:8787',
    },
  },
  }
})
