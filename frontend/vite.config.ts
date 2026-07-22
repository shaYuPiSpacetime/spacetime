import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080';
const preserveApiPrefix = process.env.VITE_API_PROXY_PRESERVE_PREFIX === 'true';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (requestPath) => preserveApiPrefix
          ? requestPath
          : requestPath.replace(/^\/api/, ''),
      },
    },
  },
});
