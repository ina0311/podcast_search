import {
  createMockPrismaClient,
  createMockTranscript,
  type MockPrismaClient
} from '../../tests/helpers/mock-prisma'
import { TranscriptRepository } from '../transcript'

describe('TranscriptRepository', () => {
  let mockPrisma: MockPrismaClient
  let repository: TranscriptRepository

  beforeEach(() => {
    mockPrisma = createMockPrismaClient()
    repository = new TranscriptRepository(mockPrisma as any)
  })

  describe('findById', () => {
    it('IDでトランスクリプトを取得できる', async () => {
      const mockTranscript = createMockTranscript({ id: 1 })
      mockPrisma.transcriptSegment.findUnique.mockResolvedValue(mockTranscript)

      const result = await repository.findById(1)

      expect(result).toEqual(mockTranscript)
      expect(mockPrisma.transcriptSegment.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      })
    })

    it('存在しないIDの場合はnullを返す', async () => {
      mockPrisma.transcriptSegment.findUnique.mockResolvedValue(null)

      const result = await repository.findById(999)

      expect(result).toBeNull()
    })
  })

  describe('findByPublicId', () => {
    it('publicIdでトランスクリプトを取得できる', async () => {
      const mockTranscript = createMockTranscript({ publicId: 'transcript-123' })
      mockPrisma.transcriptSegment.findUnique.mockResolvedValue(mockTranscript)

      const result = await repository.findByPublicId('transcript-123')

      expect(result).toEqual(mockTranscript)
      expect(mockPrisma.transcriptSegment.findUnique).toHaveBeenCalledWith({
        where: { publicId: 'transcript-123' }
      })
    })

    it('存在しないpublicIdの場合はnullを返す', async () => {
      mockPrisma.transcriptSegment.findUnique.mockResolvedValue(null)

      const result = await repository.findByPublicId('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findByEpisodeId', () => {
    it('episodeIdでトランスクリプトを取得できる', async () => {
      const mockTranscripts = [
        createMockTranscript({ id: 1, episodeId: 10, startMs: 0 }),
        createMockTranscript({ id: 2, episodeId: 10, startMs: 1000 }),
        createMockTranscript({ id: 3, episodeId: 10, startMs: 2000 })
      ]
      mockPrisma.transcriptSegment.findMany.mockResolvedValue(mockTranscripts)

      const result = await repository.findByEpisodeId(10)

      expect(result).toEqual(mockTranscripts)
      expect(mockPrisma.transcriptSegment.findMany).toHaveBeenCalledWith({
        where: { episodeId: 10 },
        take: undefined,
        skip: undefined,
        orderBy: { startMs: 'asc' }
      })
    })

    it('startMsの昇順でソートされる', async () => {
      const mockTranscripts = [
        createMockTranscript({ id: 2, episodeId: 10, startMs: 1000 }),
        createMockTranscript({ id: 1, episodeId: 10, startMs: 0 }),
        createMockTranscript({ id: 3, episodeId: 10, startMs: 2000 })
      ]
      mockPrisma.transcriptSegment.findMany.mockResolvedValue(mockTranscripts)

      const result = await repository.findByEpisodeId(10)

      expect(result).toEqual(mockTranscripts)
      expect(mockPrisma.transcriptSegment.findMany).toHaveBeenCalledWith({
        where: { episodeId: 10 },
        take: undefined,
        skip: undefined,
        orderBy: { startMs: 'asc' }
      })
    })

    it('limitとoffsetを指定して取得できる', async () => {
      const mockTranscripts = [createMockTranscript({ id: 1, episodeId: 10 })]
      mockPrisma.transcriptSegment.findMany.mockResolvedValue(mockTranscripts)

      const result = await repository.findByEpisodeId(10, {
        limit: 10,
        offset: 20
      })

      expect(result).toEqual(mockTranscripts)
      expect(mockPrisma.transcriptSegment.findMany).toHaveBeenCalledWith({
        where: { episodeId: 10 },
        take: 10,
        skip: 20,
        orderBy: { startMs: 'asc' }
      })
    })

    it('存在しないepisodeIdの場合は空配列を返す', async () => {
      mockPrisma.transcriptSegment.findMany.mockResolvedValue([])

      const result = await repository.findByEpisodeId(999)

      expect(result).toEqual([])
    })
  })

  describe('countByEpisodeId', () => {
    it('episodeIdでトランスクリプトの総数を取得できる', async () => {
      mockPrisma.transcriptSegment.count.mockResolvedValue(42)

      const result = await repository.countByEpisodeId(10)

      expect(result).toBe(42)
      expect(mockPrisma.transcriptSegment.count).toHaveBeenCalledWith({
        where: { episodeId: 10 }
      })
    })

    it('0件の場合も正しく返す', async () => {
      mockPrisma.transcriptSegment.count.mockResolvedValue(0)

      const result = await repository.countByEpisodeId(10)

      expect(result).toBe(0)
    })
  })
})
