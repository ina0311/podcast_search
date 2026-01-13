import { EpisodeRepository } from '@podcast_search/database'
import { Hono } from 'hono'
import { z } from 'zod'

const episodeRepository = new EpisodeRepository()

const episodesRouter = new Hono()
  .get('/', async (c) => {
    const episodes = await episodeRepository.findMany()
    return c.json({ episodes })
  })
  .get('/:id', async (c) => {
    const idParam = c.req.param('id')
    const parsed = z.coerce.number().int().positive().safeParse(idParam)
    if (!parsed.success) {
      return c.json({ error: 'Invalid id' }, 400)
    }
    const id = parsed.data
    const episode = await episodeRepository.findWithTranscripts(id)
    if (!episode) return c.json({ error: 'Not found' }, 404)
    return c.json(episode)
  })

export default episodesRouter
