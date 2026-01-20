import { env } from '@podcast_search/config'
import { EpisodeRepository } from '@podcast_search/database'
import { SearchCore, SearchQuerySchema } from '@podcast_search/search-core'
import { Hono } from 'hono'
import { z } from 'zod'

const episodeRepository = new EpisodeRepository()

// SearchCore は重いクライアントを生成するため、リクエストごとに生成せず共有する
const searchCore = env.OPENAI_API_KEY
  ? new SearchCore({
      openaiApiKey: env.OPENAI_API_KEY,
      qdrantUrl: env.QDRANT_URL ?? 'http://localhost:6333',
      qdrantApiKey: env.QDRANT_API_KEY
    })
  : null

const searchRouter = new Hono().get('/', async (c) => {
  if (!searchCore) {
    return c.json({ error: 'Search is disabled because OPENAI_API_KEY is not configured.' }, 503)
  }
  const q = c.req.query('q')
  const limitRaw = c.req.query('limit')
  const parsed = SearchQuerySchema.safeParse({ q, limit: limitRaw })
  if (!parsed.success) {
    return c.json({ error: 'Invalid query', issues: z.treeifyError(parsed.error) }, 400)
  }
  const { q: query, limit } = parsed.data

  const hits = await searchCore.searchByQuery(query, limit)
  const episodeIds = Array.from(
    new Set(
      hits.map((h) => h.payload?.episodeId).filter((id): id is number => typeof id === 'number')
    )
  )

  const episodes = await episodeRepository.findByIds(episodeIds)

  return c.json({ episodes, hitsCount: hits.length })
})

export default searchRouter
