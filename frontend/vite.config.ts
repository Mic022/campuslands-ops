import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to backend FastAPI on port 8000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
