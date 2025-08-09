import { Hono } from 'hono';
import { prisma } from '@podcast_search/db';
import { env } from '@podcast_search/config';
import { SearchCore, SearchQuerySchema } from '@podcast_search/search-core';

const router = new Hono();

// SearchCore は重いクライアントを生成するため、リクエストごとに生成せず共有する
const core = new SearchCore({
  openaiApiKey: env.OPENAI_API_KEY,
  qdrantUrl: env.QDRANT_URL ?? 'http://localhost:6333',
});

router.get('/', async (c) => {
  const q = c.req.query('q');
  const limitRaw = c.req.query('limit');
  const parsed = SearchQuerySchema.safeParse({ q, limit: limitRaw });
  if (!parsed.success) {
    return c.json({ error: 'Invalid query', issues: parsed.error.format() }, 400);
  }
  const { q: query, limit } = parsed.data;

  const hits = await core.searchByQuery(query, limit);
  const episodeIds = Array.from(
    new Set(
      hits
        .map((h) => h.payload?.episodeId)
        .filter((id): id is number => typeof id === 'number')
    )
  );

  const episodes = await prisma.podcastEpisode.findMany({
    where: { id: { in: episodeIds } },
    take: limit,
  });

  return c.json({ episodes, hitsCount: hits.length });
});

export default router; 