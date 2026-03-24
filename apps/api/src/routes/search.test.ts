import { EpisodeRepository } from '@podcast_search/database'
import { createSearchCoreFromEnv } from '@podcast_search/search-core'
import { Hono } from 'hono'

jest.mock('@podcast_search/database', () => ({
  EpisodeRepository: jest.fn().mockImplementation(() => ({
    findByIds: jest.fn()
  }))
}))

jest.mock('@podcast_search/search-core', () => ({
  SearchQuerySchema: jest.requireActual('@podcast_search/search-core').SearchQuerySchema,
  createSearchCoreFromEnv: jest.fn().mockReturnValue({ searchByQuery: jest.fn() })
}))

import router from './search'

const app = new Hono().route('/', router)

describe('Search routes', () => {
  const searchCoreMock = jest.mocked(createSearchCoreFromEnv).mock.results[0].value as {
    searchByQuery: jest.MockedFunction<ReturnType<typeof createSearchCoreFromEnv>['searchByQuery']>
  }
  const episodeRepoMock = jest.mocked(EpisodeRepository).mock.results[0].value as jest.Mocked<
    InstanceType<typeof EpisodeRepository>
  >

  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('ヒット複数件 → 200 + { episodes, hitsCount }', async () => {
    const hits = [
      { payload: { episodeId: 1 }, score: 0.9, id: 'v1' },
      { payload: { episodeId: 2 }, score: 0.8, id: 'v2' }
    ]
    const mockEpisodes = [
      { id: 1, title: 'Episode 1' },
      { id: 2, title: 'Episode 2' }
    ]
    searchCoreMock.searchByQuery.mockResolvedValue(hits as any)
    episodeRepoMock.findByIds.mockResolvedValue(mockEpisodes as any)

    const res = await app.request('/?q=test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ episodes: mockEpisodes, hitsCount: 2 })
  })

  it('ヒット0件 → 200 + { episodes: [], hitsCount: 0 }', async () => {
    searchCoreMock.searchByQuery.mockResolvedValue([])
    episodeRepoMock.findByIds.mockResolvedValue([])

    const res = await app.request('/?q=test')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ episodes: [], hitsCount: 0 })
  })

  it('qパラメータなし → 400', async () => {
    const res = await app.request('/')

    expect(res.status).toBe(400)
  })

  it('limitに文字列 → 400', async () => {
    const res = await app.request('/?q=test&limit=abc')

    expect(res.status).toBe(400)
  })

  it('searchCore未初期化時 → 503', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@podcast_search/search-core', () => ({
        SearchQuerySchema: jest.requireActual('@podcast_search/search-core').SearchQuerySchema,
        createSearchCoreFromEnv: jest.fn(() => {
          throw new Error('Init failed')
        })
      }))
      jest.doMock('@podcast_search/database', () => ({
        EpisodeRepository: jest.fn().mockImplementation(() => ({ findByIds: jest.fn() }))
      }))
      const { default: isolatedRouter } = await import('./search')
      const testApp = new Hono().route('/', isolatedRouter)
      const res = await testApp.request('/?q=test')
      expect(res.status).toBe(503)
    })
  })
})
