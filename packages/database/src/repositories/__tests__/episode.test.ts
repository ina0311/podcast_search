jest.mock('../../client', () => ({
  prisma: {}
}))

import type { DbClient } from '../../client'
import type { EpisodeStatus } from '../../generated/prisma/client'
import {
  createMockEpisode,
  createMockPrismaClient,
  createMockTranscript,
  type MockPrismaClient
} from '../../tests/helpers/mock-prisma'
import { EpisodeRepository } from '../episode'

describe('EpisodeRepository', () => {
  let mockPrisma: MockPrismaClient
  let repository: EpisodeRepository

  beforeEach(() => {
    mockPrisma = createMockPrismaClient()
    repository = new EpisodeRepository(mockPrisma as unknown as DbClient)
  })

  describe('findById', () => {
    it('IDでエピソードを取得できる', async () => {
      const mockEpisode = createMockEpisode({ id: 1 })
      mockPrisma.podcastEpisode.findUnique.mockResolvedValue(mockEpisode)

      const result = await repository.findById(1)

      expect(result).toEqual(mockEpisode)
      expect(mockPrisma.podcastEpisode.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
    })

    it('存在しないIDの場合はnullを返す', async () => {
      mockPrisma.podcastEpisode.findUnique.mockResolvedValue(null)

      const result = await repository.findById(999)

      expect(result).toBeNull()
    })
  })

  describe('findByPublicId', () => {
    it('publicIdでエピソードを取得できる', async () => {
      const mockEpisode = createMockEpisode({ publicId: 'episode-123' })
      mockPrisma.podcastEpisode.findUnique.mockResolvedValue(mockEpisode)

      const result = await repository.findByPublicId('episode-123')

      expect(result).toEqual(mockEpisode)
      expect(mockPrisma.podcastEpisode.findUnique).toHaveBeenCalledWith({
        where: { publicId: 'episode-123' }
      })
    })
  })

  describe('findByIds', () => {
    it('複数のIDでエピソードを取得できる', async () => {
      const mockEpisodes = [createMockEpisode({ id: 1 }), createMockEpisode({ id: 2 })]
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(mockEpisodes)

      const result = await repository.findByIds([1, 2])

      expect(result).toEqual(mockEpisodes)
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } }
      })
    })

    it('空の配列を渡した場合は空配列を返す', async () => {
      const result = await repository.findByIds([])

      expect(result).toEqual([])
      expect(mockPrisma.podcastEpisode.findMany).not.toHaveBeenCalled()
    })

    it('存在しないIDの場合は空配列を返す', async () => {
      mockPrisma.podcastEpisode.findMany.mockResolvedValue([])

      const result = await repository.findByIds([999, 1000])

      expect(result).toEqual([])
    })
  })

  describe('findWithTranscripts', () => {
    it('トランスクリプトを含めてエピソードを取得できる', async () => {
      const mockEpisode = createMockEpisode({ id: 1 })
      const mockTranscripts = [
        createMockTranscript({ id: 1, episodeId: 1 }),
        createMockTranscript({ id: 2, episodeId: 1 })
      ]
      const mockEpisodeWithTranscripts = {
        ...mockEpisode,
        transcripts: mockTranscripts
      }
      mockPrisma.podcastEpisode.findUnique.mockResolvedValue(mockEpisodeWithTranscripts)

      const result = await repository.findWithTranscripts(1)

      expect(result).toEqual(mockEpisodeWithTranscripts)
      expect(mockPrisma.podcastEpisode.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { transcripts: true }
      })
    })

    it('存在しないIDの場合はnullを返す', async () => {
      mockPrisma.podcastEpisode.findUnique.mockResolvedValue(null)

      const result = await repository.findWithTranscripts(999)

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('オプションなしで全件取得できる', async () => {
      const mockEpisodes = [createMockEpisode({ id: 1 }), createMockEpisode({ id: 2 })]
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(mockEpisodes)

      const result = await repository.findMany()

      expect(result).toEqual(mockEpisodes)
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: {},
        take: undefined,
        skip: undefined,
        orderBy: { publishedAt: 'desc' }
      })
    })

    it('podcastIdでフィルタリングできる', async () => {
      const mockEpisodes = [createMockEpisode({ id: 1, podcastId: 10 })]
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(mockEpisodes)

      const result = await repository.findMany({ podcastId: 10 })

      expect(result).toEqual(mockEpisodes)
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { podcastId: 10 },
        take: undefined,
        skip: undefined,
        orderBy: { publishedAt: 'desc' }
      })
    })

    it('statusでフィルタリングできる', async () => {
      const mockEpisodes = [createMockEpisode({ id: 1, status: 'PUBLISHED' as EpisodeStatus })]
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(mockEpisodes)

      const result = await repository.findMany({ status: 'PUBLISHED' })

      expect(result).toEqual(mockEpisodes)
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' },
        take: undefined,
        skip: undefined,
        orderBy: { publishedAt: 'desc' }
      })
    })

    it('podcastIdとstatusの両方でフィルタリングできる', async () => {
      const mockEpisodes = [
        createMockEpisode({
          id: 1,
          podcastId: 10,
          status: 'PUBLISHED' as EpisodeStatus
        })
      ]
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(mockEpisodes)

      const result = await repository.findMany({
        podcastId: 10,
        status: 'PUBLISHED'
      })

      expect(result).toEqual(mockEpisodes)
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: { podcastId: 10, status: 'PUBLISHED' },
        take: undefined,
        skip: undefined,
        orderBy: { publishedAt: 'desc' }
      })
    })

    it('limitとoffsetを指定して取得できる', async () => {
      const mockEpisodes = [createMockEpisode({ id: 1 })]
      mockPrisma.podcastEpisode.findMany.mockResolvedValue(mockEpisodes)

      const result = await repository.findMany({ limit: 10, offset: 20 })

      expect(result).toEqual(mockEpisodes)
      expect(mockPrisma.podcastEpisode.findMany).toHaveBeenCalledWith({
        where: {},
        take: 10,
        skip: 20,
        orderBy: { publishedAt: 'desc' }
      })
    })
  })

  describe('count', () => {
    it('オプションなしで総数を取得できる', async () => {
      mockPrisma.podcastEpisode.count.mockResolvedValue(100)

      const result = await repository.count()

      expect(result).toBe(100)
      expect(mockPrisma.podcastEpisode.count).toHaveBeenCalledWith({
        where: {}
      })
    })

    it('podcastIdでフィルタリングしてカウントできる', async () => {
      mockPrisma.podcastEpisode.count.mockResolvedValue(5)

      const result = await repository.count({ podcastId: 10 })

      expect(result).toBe(5)
      expect(mockPrisma.podcastEpisode.count).toHaveBeenCalledWith({
        where: { podcastId: 10 }
      })
    })

    it('statusでフィルタリングしてカウントできる', async () => {
      mockPrisma.podcastEpisode.count.mockResolvedValue(3)

      const result = await repository.count({ status: 'PUBLISHED' })

      expect(result).toBe(3)
      expect(mockPrisma.podcastEpisode.count).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED' }
      })
    })

    it('podcastIdとstatusの両方でフィルタリングしてカウントできる', async () => {
      mockPrisma.podcastEpisode.count.mockResolvedValue(2)

      const result = await repository.count({
        podcastId: 10,
        status: 'PUBLISHED'
      })

      expect(result).toBe(2)
      expect(mockPrisma.podcastEpisode.count).toHaveBeenCalledWith({
        where: { podcastId: 10, status: 'PUBLISHED' }
      })
    })
  })
})
