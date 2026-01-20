import type { AppType } from 'api'
import { hc } from 'hono/client'

// 本番環境では VITE_API_URL を使用、開発環境では /api プロキシを使用
const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient = hc<AppType>(apiBaseUrl)

export const assertOk: (res: { ok: boolean }) => asserts res is { ok: true } = (res) => {
  if (!res.ok) throw new Error('Request failed')
}
