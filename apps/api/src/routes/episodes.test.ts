import { EpisodeRepository } from '@podcast_search/database'
import { Hono } from 'hono'

jest.mock('@podcast_search/database', () => ({
  EpisodeRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn(),
    findWithTranscripts: jest.fn()
  }))
}))

import router from './episodes'

const app = new Hono().route('/', router)

describe('Episodes routes', () => {
  const repo = jest.mocked(EpisodeRepository).mock.results[0].value as jest.Mocked<
    InstanceType<typeof EpisodeRepository>
  >

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /', () => {
    it('200 + { episodes }', async () => {
      const mockEpisodes = [{ id: 1, title: 'Test Episode' }]
      repo.findMany.mockResolvedValue(mockEpisodes as any)

      const res = await app.request('/')

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ episodes: mockEpisodes })
    })
  })

  describe('GET /:id', () => {
    it('存在するID → 200 + エピソード', async () => {
      const mockEpisode = { id: 1, title: 'Test', transcripts: [] }
      repo.findWithTranscripts.mockResolvedValue(mockEpisode as any)

      const res = await app.request('/1')

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(mockEpisode)
    })

    it('存在しないID → 404', async () => {
      repo.findWithTranscripts.mockResolvedValue(null)

      const res = await app.request('/999')

      expect(res.status).toBe(404)
    })

    it('数値でないID → 400', async () => {
      const res = await app.request('/abc')

      expect(res.status).toBe(400)
    })
  })
})
