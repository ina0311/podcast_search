import { PersonalityAudioSampleRepository, PersonalityRepository } from '@podcast_search/database'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { deleteAudioSample, uploadAudioSample } from '../lib/supabase'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
})
const updateSchema = createSchema.partial()

const router = new Hono()
  .get('/', async (c) => {
    const repo = new PersonalityRepository()
    return c.json(await repo.findMany())
  })
  .post('/', async (c) => {
    const raw = await c.req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    const personality = await repo.create(parsed.data)
    return c.json(personality, 201)
  })
  .get('/by-podcast', async (c) => {
    const podcastId = Number(c.req.query('podcastId'))
    if (Number.isNaN(podcastId)) return c.json({ error: 'podcastId required' }, 400)
    const repo = new PersonalityRepository()
    return c.json(await repo.findByPodcastId(podcastId))
  })
  .get('/by-episode', async (c) => {
    const episodeId = Number(c.req.query('episodeId'))
    if (Number.isNaN(episodeId)) return c.json({ error: 'episodeId required' }, 400)
    const repo = new PersonalityRepository()
    return c.json(await repo.findByEpisodeId(episodeId))
  })
  .post('/by-podcast/:podcastId', async (c) => {
    const podcastId = Number(c.req.param('podcastId'))
    const raw = await c.req.json().catch(() => ({}))
    const parsed = z
      .object({ personalityId: z.number(), role: z.string().optional() })
      .safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    await repo.addToPodcast(parsed.data.personalityId, podcastId, parsed.data.role)
    return c.body(null, 204)
  })
  .delete('/by-podcast/:podcastId/:personalityId', async (c) => {
    const repo = new PersonalityRepository()
    await repo.removeFromPodcast(
      Number(c.req.param('personalityId')),
      Number(c.req.param('podcastId'))
    )
    return c.body(null, 204)
  })
  .post('/by-episode/:episodeId', async (c) => {
    const episodeId = Number(c.req.param('episodeId'))
    const raw = await c.req.json().catch(() => ({}))
    const parsed = z
      .object({ personalityId: z.number(), role: z.string().optional() })
      .safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    await repo.addToEpisode(parsed.data.personalityId, episodeId, parsed.data.role)
    return c.body(null, 204)
  })
  .delete('/by-episode/:episodeId/:personalityId', async (c) => {
    const repo = new PersonalityRepository()
    await repo.removeFromEpisode(
      Number(c.req.param('personalityId')),
      Number(c.req.param('episodeId'))
    )
    return c.body(null, 204)
  })
  .get('/:publicId', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })
    return c.json(p)
  })
  .patch('/:publicId', async (c) => {
    const raw = await c.req.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })
    return c.json(await repo.update(p.id, parsed.data))
  })
  .delete('/:publicId', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })
    await repo.delete(p.id)
    return c.body(null, 204)
  })
  .post('/:publicId/samples', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })

    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file) return c.json({ error: 'file is required' }, 400)

    const filename = `${p.publicId}/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const buffer = await file.arrayBuffer()
    const storageUrl = await uploadAudioSample(buffer, filename)

    const sampleRepo = new PersonalityAudioSampleRepository()
    const sample = await sampleRepo.create({
      personalityId: p.id,
      storageUrl,
      durationSec: null
    })
    return c.json(sample, 201)
  })
  .delete('/:publicId/samples/:sampleId', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })

    const sampleRepo = new PersonalityAudioSampleRepository()
    const sample = await sampleRepo.findById(Number(c.req.param('sampleId')))
    if (!sample || sample.personalityId !== p.id) {
      throw new HTTPException(404, { message: 'Sample not found' })
    }

    const url = new URL(sample.storageUrl)
    const pathParts = url.pathname.split('/object/public/')
    if (pathParts[1]) {
      const storagePath = pathParts[1].split('/').slice(1).join('/')
      await deleteAudioSample(storagePath)
    }
    await sampleRepo.delete(sample.id)
    return c.body(null, 204)
  })

export default router
