import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to backend FastAPI on port 8000
export default defineConfig({
  plugins: [react()],
  resolve: {
    // TypeScript primero: en src/ quedan archivos .jsx heredados (App.jsx, api.js) con el mismo
    // nombre que los .tsx actuales, y Vite por defecto resolvería './App' al .jsx.
    extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json'],
  },
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
