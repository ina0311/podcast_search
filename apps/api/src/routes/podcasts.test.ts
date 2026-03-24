import { PodcastRepository } from '@podcast_search/database'
import { Hono } from 'hono'

jest.mock('@podcast_search/database', () => ({
  PodcastRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn(),
    findWithEpisodes: jest.fn()
  }))
}))

import router from './podcasts'

const app = new Hono().route('/', router)

describe('Podcasts routes', () => {
  const repo = jest.mocked(PodcastRepository).mock.results[0].value as jest.Mocked<
    InstanceType<typeof PodcastRepository>
  >

  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('GET /', () => {
    it('200 + { podcasts }', async () => {
      const mockPodcasts = [{ id: 1, title: 'Test Podcast' }]
      repo.findMany.mockResolvedValue(mockPodcasts as any)

      const res = await app.request('/')

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ podcasts: mockPodcasts })
    })
  })

  describe('GET /:id', () => {
    it('存在するID → 200 + ポッドキャスト', async () => {
      const mockPodcast = { id: 1, title: 'Test', episodes: [] }
      repo.findWithEpisodes.mockResolvedValue(mockPodcast as any)

      const res = await app.request('/1')

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(mockPodcast)
    })

    it('存在しないID → 404', async () => {
      repo.findWithEpisodes.mockResolvedValue(null)

      const res = await app.request('/999')

      expect(res.status).toBe(404)
    })

    it('数値でないID → 400', async () => {
      const res = await app.request('/abc')

      expect(res.status).toBe(400)
    })
  })
})
