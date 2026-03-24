import type { EpisodeStatus, PodcastEpisode, TranscriptSegment } from '../generated/prisma/client'
import { normalizeEnclosureUrl } from '../utils/normalizeEnclosureUrl'
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

export interface UpsertEpisodeInput {
  podcastId: number
  title: string
  enclosureUrl: string
  publishedAt?: Date | null
  durationSec?: number | null
  description?: string | null
  source?: string | null
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

  /**
   * enclosureUrl を正規化してからエピソードを upsert する
   *
   * `(podcastId, enclosureUrl)` の複合ユニーク制約を使って冪等に登録する。
   * 正規化した URL を一意キーとして使用するため、追跡クエリパラメータの差異による
   * 重複取り込みを防止できる。
   */
  async upsertByEnclosureUrl(input: UpsertEpisodeInput): Promise<PodcastEpisode> {
    const normalizedUrl = normalizeEnclosureUrl(input.enclosureUrl)
    const { podcastId, title, publishedAt, durationSec, description, source } = input

    return this.db.podcastEpisode.upsert({
      where: {
        podcastId_enclosureUrl: {
          podcastId,
          enclosureUrl: normalizedUrl
        }
      },
      create: {
        podcastId,
        title,
        enclosureUrl: normalizedUrl,
        publishedAt: publishedAt ?? null,
        durationSec: durationSec ?? null,
        description: description ?? null,
        source: source ?? null
      },
      update: {
        title,
        publishedAt: publishedAt ?? null,
        durationSec: durationSec ?? null,
        description: description ?? null,
        source: source ?? null
      }
    })
  }
}
