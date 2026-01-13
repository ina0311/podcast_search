import { PodcastRepository } from '@podcast_search/database'
import { Hono } from 'hono'
import { z } from 'zod'

const podcastRepository = new PodcastRepository()

const podcastsRouter = new Hono()
  .get('/', async (c) => {
    const podcasts = await podcastRepository.findMany()
    return c.json({ podcasts })
  })
  .get('/:id', async (c) => {
    const idParam = c.req.param('id')
    const parsed = z.coerce.number().int().positive().safeParse(idParam)
    if (!parsed.success) {
      return c.json({ error: 'Invalid id' }, 400)
    }
    const id = parsed.data
    const podcast = await podcastRepository.findWithEpisodes(id)
    if (!podcast) return c.json({ error: 'Not found' }, 404)
    return c.json(podcast)
  })

export default podcastsRouter
