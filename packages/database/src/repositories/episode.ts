import type { EpisodeStatus, PodcastEpisode, TranscriptSegment } from '../generated/prisma/client'
import { BaseRepository } from './base'

export type EpisodeWithTranscripts = PodcastEpisode & {
  transcripts: TranscriptSegment[]
}

export interface FindEpisodesOptions {
  podcastId?: number
  status?: EpisodeStatus
  limit?: number
  offset?: number
}

export class EpisodeRepository extends BaseRepository {
  async findById(id: number): Promise<PodcastEpisode | null> {
    return this.db.podcastEpisode.findUnique({
      where: { id }
    })
  }

  async findByPublicId(publicId: string): Promise<PodcastEpisode | null> {
    return this.db.podcastEpisode.findUnique({
      where: { publicId }
    })
  }

  async findByIds(ids: number[]): Promise<PodcastEpisode[]> {
    if (ids.length === 0) return []
    return this.db.podcastEpisode.findMany({
      where: { id: { in: ids } }
    })
  }

  async findWithTranscripts(id: number): Promise<EpisodeWithTranscripts | null> {
    return this.db.podcastEpisode.findUnique({
      where: { id },
      include: { transcripts: true }
    })
  }

  async findMany(options: FindEpisodesOptions = {}): Promise<PodcastEpisode[]> {
    const { podcastId, status, limit, offset } = options
    return this.db.podcastEpisode.findMany({
      where: {
        ...(podcastId && { podcastId }),
        ...(status && { status })
      },
      take: limit,
      skip: offset,
      orderBy: { publishedAt: 'desc' }
    })
  }

  async count(options: Pick<FindEpisodesOptions, 'podcastId' | 'status'> = {}): Promise<number> {
    const { podcastId, status } = options
    return this.db.podcastEpisode.count({
      where: {
        ...(podcastId && { podcastId }),
        ...(status && { status })
      }
    })
  }
}
