import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/website': { target: 'http://localhost:8080', changeOrigin: false, rewrite: path => path.replace(/^\/api/, '') },
    },
  },
})
