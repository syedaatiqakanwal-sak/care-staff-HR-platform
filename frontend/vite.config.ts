import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 502 from /api/* in dev usually means nothing is listening here — start Nest (backend) on this port.
      '/api': {
        target: 'http://localhost:4002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
