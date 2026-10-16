import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy /api to backend FastAPI on port 8000
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Evita duplicación de instancias de React / Three.js que causan errores en React Three Fiber
    dedupe: ['react', 'react-dom', 'three']
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
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei']
  }
})
