jest.mock('@podcast_search/database', () => ({
  PersonalityRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn().mockResolvedValue([]),
    findByPublicId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addToPodcast: jest.fn(),
    removeFromPodcast: jest.fn(),
    addToEpisode: jest.fn(),
    removeFromEpisode: jest.fn(),
    findByPodcastId: jest.fn().mockResolvedValue([]),
    findByEpisodeId: jest.fn().mockResolvedValue([])
  })),
  PersonalityAudioSampleRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    delete: jest.fn()
  }))
}))
jest.mock('../lib/supabase', () => ({
  uploadAudioSample: jest.fn().mockResolvedValue('https://example.com/sample.mp3'),
  deleteAudioSample: jest.fn()
}))
jest.mock('../middleware/auth', () => ({
  adminAuth: (_c: any, next: any) => next()
}))

import { PersonalityRepository } from '@podcast_search/database'
import { Hono } from 'hono'

describe('personalities routes', () => {
  let app: Hono
  beforeEach(async () => {
    jest.clearAllMocks()
    const { default: router } = await import('./personalities')
    app = new Hono().route('/personalities', router)
  })

  it('GET /personalities は 200 を返す', async () => {
    const res = await app.request('/personalities')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('POST /personalities は 201 を返す', async () => {
    jest.mocked(PersonalityRepository).mockImplementationOnce(
      () =>
        ({
          create: jest
            .fn()
            .mockResolvedValue({ id: 1, publicId: 'uuid', name: 'テスト', description: null })
        }) as any
    )
    const res = await app.request('/personalities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'テスト' })
    })
    expect(res.status).toBe(201)
  })

  it('POST /personalities - name なしは 400', async () => {
    const res = await app.request('/personalities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(400)
  })
})
