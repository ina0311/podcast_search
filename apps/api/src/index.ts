import { serve } from '@hono/node-server'
import { env } from '@podcast_search/config'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import logger from './lib/logger'

import { adminAuth } from './middleware/auth'
import adminRouter from './routes/admin'
import episodesRouter from './routes/episodes'
import personalitiesRouter from './routes/personalities'
import podcastsRouter from './routes/podcasts'
import searchRouter from './routes/search'

const app = new Hono()
  // Health check endpoint
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/podcasts', podcastsRouter)
  .route('/episodes', episodesRouter)
  .route('/search', searchRouter)
  .route('/admin', adminRouter)
  .route('/personalities', personalitiesRouter)

// Middlewares (applied separately to preserve type inference)
// CORS設定: 環境変数 ALLOWED_ORIGINS があればそれを使用、なければ開発環境のデフォルト
const allowedOrigins = env.ALLOWED_ORIGINS
  ? env.ALLOWED_ORIGINS.split(',').map((origin: string) => origin.trim())
  : ['http://localhost:5173', 'http://localhost:8080'] // 開発環境のデフォルト

app.use('/admin/*', adminAuth)
app.use('/personalities/*', adminAuth)
app.use(
  '*',
  cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
)
app.use('*', compress())
app.use('*', secureHeaders())

app.notFound((c) => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error')
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Export type for Hono RPC client
export type AppType = typeof app

const port = env.PORT
logger.info({ port }, 'API server started')
serve({ fetch: app.fetch, port })
