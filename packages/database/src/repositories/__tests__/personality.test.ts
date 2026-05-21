import { PersonalityRepository } from '../personality'

jest.mock('../../client', () => ({ prisma: { personality: {} } }))

describe('PersonalityRepository', () => {
  let repo: PersonalityRepository
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      personality: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      personalityPodcast: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn()
      },
      episodePersonality: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn()
      }
    }
    repo = new PersonalityRepository(mockDb)
  })

  it('findByPodcastId は podcastId に紐づく Personality を返す', async () => {
    mockDb.personalityPodcast.findMany.mockResolvedValue([
      { personality: { id: 1, name: 'ホスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findByPodcastId(10)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ホスト')
  })

  it('findByEpisodeId はエピソード個別設定を返す', async () => {
    mockDb.episodePersonality.findMany.mockResolvedValue([
      { personality: { id: 2, name: 'ゲスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findByEpisodeId(5)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ゲスト')
  })

  it('findPersonalitiesForTranscription はエピソード優先でフォールバックする', async () => {
    mockDb.episodePersonality.findMany.mockResolvedValueOnce([
      { personality: { id: 2, name: 'ゲスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findPersonalitiesForTranscription({ podcastId: 1, episodeId: 5 })
    expect(result[0].name).toBe('ゲスト')
    expect(mockDb.personalityPodcast.findMany).not.toHaveBeenCalled()
  })

  it('findPersonalitiesForTranscription はエピソード設定なしの場合 podcastId のものを返す', async () => {
    mockDb.episodePersonality.findMany.mockResolvedValueOnce([])
    mockDb.personalityPodcast.findMany.mockResolvedValueOnce([
      { personality: { id: 1, name: 'ホスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findPersonalitiesForTranscription({ podcastId: 1, episodeId: 5 })
    expect(result[0].name).toBe('ホスト')
  })
})
