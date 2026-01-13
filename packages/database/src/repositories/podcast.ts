import type { Podcast, PodcastEpisode } from '../generated/prisma/client'
import { BaseRepository } from './base'

export type PodcastWithEpisodes = Podcast & {
  episodes: PodcastEpisode[]
}

export interface FindPodcastsOptions {
  limit?: number
  offset?: number
}

export class PodcastRepository extends BaseRepository {
  async findById(id: number): Promise<Podcast | null> {
    return this.db.podcast.findUnique({
      where: { id }
    })
  }

  async findByPublicId(publicId: string): Promise<Podcast | null> {
    return this.db.podcast.findUnique({
      where: { publicId }
    })
  }

  async findWithEpisodes(id: number): Promise<PodcastWithEpisodes | null> {
    return this.db.podcast.findUnique({
      where: { id },
      include: { episodes: true }
    })
  }

  async findMany(options: FindPodcastsOptions = {}): Promise<Podcast[]> {
    const { limit, offset } = options
    return this.db.podcast.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    })
  }

  async count(): Promise<number> {
    return this.db.podcast.count()
  }
}
