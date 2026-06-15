import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      // En dev, proxy /api vers le backend (évite les soucis CORS)
      '/api': 'http://localhost:3001',
    },
  },
})
