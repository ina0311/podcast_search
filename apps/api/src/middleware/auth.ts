import { env } from '@podcast_search/config'
import type { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'

export const adminAuth: MiddlewareHandler = async (c, next) => {
  if (!env.ADMIN_API_KEY) {
    throw new HTTPException(503, { message: 'Admin API key not configured' })
  }
  const key = c.req.header('X-Admin-Key')
  if (key !== env.ADMIN_API_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  await next()
}
