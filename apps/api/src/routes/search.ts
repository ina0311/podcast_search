import { EpisodeRepository } from '@podcast_search/database'
import { createSearchCoreFromEnv, SearchQuerySchema } from '@podcast_search/search-core'
import { Hono } from 'hono'
import { z } from 'zod'
import logger from '../lib/logger'

const episodeRepository = new EpisodeRepository()

// SearchCore は重いクライアントを生成するため、リクエストごとに生成せず共有する
// 環境変数に基づいて適切な実装を自動選択（AWS移行時は環境変数を変更するだけ）
let searchCore: ReturnType<typeof createSearchCoreFromEnv> | null = null
let searchCoreInitError: string | null = null

try {
  searchCore = createSearchCoreFromEnv()
} catch (error) {
  searchCoreInitError = error instanceof Error ? error.message : String(error)
  logger.error(
    { error: searchCoreInitError },
    '[SearchCore] Initialization failed. Search endpoint will return 503.'
  )
  searchCore = null
}

const searchRouter = new Hono().get('/', async (c) => {
  if (!searchCore) {
    return c.json(
      {
        error: 'Search is temporarily unavailable.',
        reason: searchCoreInitError ?? 'Unknown initialization error'
      },
      503
    )
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
