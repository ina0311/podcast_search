import type { TranscriptSegment } from '../generated/prisma/client'
import { BaseRepository } from './base'

export interface FindTranscriptsOptions {
  episodeId: number
  limit?: number
  offset?: number
}

export class TranscriptRepository extends BaseRepository {
  async findById(id: number): Promise<TranscriptSegment | null> {
    return this.db.transcriptSegment.findUnique({
      where: { id }
    })
  }

  async findByPublicId(publicId: string): Promise<TranscriptSegment | null> {
    return this.db.transcriptSegment.findUnique({
      where: { publicId }
    })
  }

  async findByEpisodeId(
    episodeId: number,
    options: Omit<FindTranscriptsOptions, 'episodeId'> = {}
  ): Promise<TranscriptSegment[]> {
    const { limit, offset } = options
    return this.db.transcriptSegment.findMany({
      where: { episodeId },
      take: limit,
      skip: offset,
      orderBy: { startMs: 'asc' }
    })
  }

  async countByEpisodeId(episodeId: number): Promise<number> {
    return this.db.transcriptSegment.count({
      where: { episodeId }
    })
  }
}
