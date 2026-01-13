import { DEFAULT_API_PORT } from '@podcast_search/config'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// APIサーバーのURL（Docker内では環境変数 API_URL を設定）
const API_URL = process.env.API_URL ?? `http://localhost:${DEFAULT_API_PORT}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // /api 以下の全リクエストをAPIサーバーにプロキシ
      '/api': {
        target: API_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
