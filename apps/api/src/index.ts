import { serve } from '@hono/node-server'
import { env } from '@podcast_search/config'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import episodesRouter from './routes/episodes'
import podcastsRouter from './routes/podcasts'
import searchRouter from './routes/search'

const app = new Hono()
  // Health check endpoint
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/podcasts', podcastsRouter)
  .route('/episodes', episodesRouter)
  .route('/search', searchRouter)

// Middlewares (applied separately to preserve type inference)
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173', // vite dev
      'http://localhost:8080' // docker admin-ui
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })
)
app.use('*', compress())
app.use('*', secureHeaders())

app.notFound((c) => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Export type for Hono RPC client
export type AppType = typeof app

const port = env.PORT
console.log(`🚀 API listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
