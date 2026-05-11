jest.mock('../../client', () => ({
  prisma: {}
}))

import {
  createMockEpisode,
  createMockPodcast,
  createMockPrismaClient,
  type MockPrismaClient
} from '../../tests/helpers/mock-prisma'
import { PodcastRepository } from '../podcast'

describe('PodcastRepository', () => {
  let mockPrisma: MockPrismaClient
  let repository: PodcastRepository

  beforeEach(() => {
    mockPrisma = createMockPrismaClient()
    repository = new PodcastRepository(mockPrisma as any)
  })

  describe('findById', () => {
    it('IDでポッドキャストを取得できる', async () => {
      const mockPodcast = createMockPodcast({ id: 1 })
      mockPrisma.podcast.findUnique.mockResolvedValue(mockPodcast)

      const result = await repository.findById(1)

      expect(result).toEqual(mockPodcast)
      expect(mockPrisma.podcast.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
    })

    it('存在しないIDの場合はnullを返す', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(null)

      const result = await repository.findById(999)

      expect(result).toBeNull()
      expect(mockPrisma.podcast.findUnique).toHaveBeenCalledWith({
        where: { id: 999 }
      })
    })
  })

  describe('findByPublicId', () => {
    it('publicIdでポッドキャストを取得できる', async () => {
      const mockPodcast = createMockPodcast({ publicId: 'podcast-123' })
      mockPrisma.podcast.findUnique.mockResolvedValue(mockPodcast)

      const result = await repository.findByPublicId('podcast-123')

      expect(result).toEqual(mockPodcast)
      expect(mockPrisma.podcast.findUnique).toHaveBeenCalledWith({
        where: { publicId: 'podcast-123' }
      })
    })

    it('存在しないpublicIdの場合はnullを返す', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(null)

      const result = await repository.findByPublicId('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findWithEpisodes', () => {
    it('エピソードを含めてポッドキャストを取得できる', async () => {
      const mockPodcast = createMockPodcast({ id: 1 })
      const mockEpisodes = [
        createMockEpisode({ id: 1, podcastId: 1 }),
        createMockEpisode({ id: 2, podcastId: 1 })
      ]
      const mockPodcastWithEpisodes = {
        ...mockPodcast,
        episodes: mockEpisodes
      }
      mockPrisma.podcast.findUnique.mockResolvedValue(mockPodcastWithEpisodes)

      const result = await repository.findWithEpisodes(1)

      expect(result).toEqual(mockPodcastWithEpisodes)
      expect(mockPrisma.podcast.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { episodes: true }
      })
    })

    it('存在しないIDの場合はnullを返す', async () => {
      mockPrisma.podcast.findUnique.mockResolvedValue(null)

      const result = await repository.findWithEpisodes(999)

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('オプションなしで全件取得できる', async () => {
      const mockPodcasts = [createMockPodcast({ id: 1 }), createMockPodcast({ id: 2 })]
      mockPrisma.podcast.findMany.mockResolvedValue(mockPodcasts)

      const result = await repository.findMany()

      expect(result).toEqual(mockPodcasts)
      expect(mockPrisma.podcast.findMany).toHaveBeenCalledWith({
        take: undefined,
        skip: undefined,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('limitとoffsetを指定して取得できる', async () => {
      const mockPodcasts = [createMockPodcast({ id: 1 })]
      mockPrisma.podcast.findMany.mockResolvedValue(mockPodcasts)

      const result = await repository.findMany({ limit: 10, offset: 20 })

      expect(result).toEqual(mockPodcasts)
      expect(mockPrisma.podcast.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 20,
        orderBy: { createdAt: 'desc' }
      })
    })

    it('空の配列を返す場合がある', async () => {
      mockPrisma.podcast.findMany.mockResolvedValue([])

      const result = await repository.findMany()

      expect(result).toEqual([])
    })
  })

  describe('count', () => {
    it('ポッドキャストの総数を取得できる', async () => {
      mockPrisma.podcast.count.mockResolvedValue(42)

      const result = await repository.count()

      expect(result).toBe(42)
      expect(mockPrisma.podcast.count).toHaveBeenCalled()
    })

    it('0件の場合も正しく返す', async () => {
      mockPrisma.podcast.count.mockResolvedValue(0)

      const result = await repository.count()

      expect(result).toBe(0)
    })
  })
})
