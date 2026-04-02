import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/huggingface': {
        target: 'https://router.huggingface.co/hf-inference',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/huggingface/, '')
      },
      '/api/hf-chat': {
        target: 'https://router.huggingface.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hf-chat/, '')
      }
    }
  }
})
