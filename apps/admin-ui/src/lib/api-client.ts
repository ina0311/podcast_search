import type { AppType } from 'api'
import { hc } from 'hono/client'

export const apiClient = hc<AppType>('/api')

export const assertOk: (res: { ok: boolean }) => asserts res is { ok: true } = (res) => {
  if (!res.ok) throw new Error('Request failed')
}
