import {
  EpisodeRepository,
  PodcastRepository,
  TranscriptRepository
} from '@podcast_search/database'
import { createSearchCoreFromEnv } from '@podcast_search/search-core'
import logger from '../../lib/logger'
import { fetchRssEpisodes, type RssEpisode } from '../../services/rss/rss-fetcher'
import { deleteAudio, downloadAudio } from '../../services/transcription/audio-downloader'
import { transcribeAudio } from '../../services/transcription/whisper-runner'
import { jobStore } from './job-store'

export async function runImport(): Promise<void> {
  const podcastRepo = new PodcastRepository()
  const episodeRepo = new EpisodeRepository()
  const transcriptRepo = new TranscriptRepository()
  const searchCore = createSearchCoreFromEnv()

  // Phase 1: RSS フィードから全エピソードを収集
  const podcasts = await podcastRepo.findMany()
  const podcastsWithRss = podcasts.filter(
    (p): p is typeof p & { rssUrl: string } => p.rssUrl != null
  )

  const allItems: { podcastId: number; ep: RssEpisode }[] = []
  for (const podcast of podcastsWithRss) {
    try {
      const episodes = await fetchRssEpisodes(podcast.rssUrl)
      for (const ep of episodes) {
        allItems.push({ podcastId: podcast.id, ep })
      }
    } catch (err) {
      logger.error({ err, podcastId: podcast.id }, 'RSS fetch failed')
    }
  }

  jobStore.start(allItems.length)

  // Phase 2: 各エピソードを処理
  for (const { podcastId, ep } of allItems) {
    let dbEpisodeId: number
    try {
      const dbEpisode = await episodeRepo.upsertByEnclosureUrl({
        podcastId,
        title: ep.title,
        enclosureUrl: ep.audioUrl,
        publishedAt: ep.publishedAt,
        durationSec: ep.durationSec,
        description: ep.description
      })
      dbEpisodeId = dbEpisode.id
    } catch (err) {
      logger.error({ err, title: ep.title }, 'Episode upsert failed')
      jobStore.addError(-1, err instanceof Error ? err.message : String(err))
      continue
    }

    // 既に文字起こし済みならスキップ
    let transcriptCount: number
    try {
      transcriptCount = await transcriptRepo.countByEpisodeId(dbEpisodeId)
    } catch (err) {
      logger.error({ err, episodeId: dbEpisodeId }, 'Transcript count failed')
      jobStore.addError(dbEpisodeId, err instanceof Error ? err.message : String(err))
      continue
    }

    if (transcriptCount > 0) {
      jobStore.incrementDone()
      continue
    }

    // 音声ファイルをダウンロード
    const fileName = `ep-${dbEpisodeId}-${Date.now()}.mp3`
    let audioPath: string
    try {
      audioPath = await downloadAudio(ep.audioUrl, fileName)
    } catch (err) {
      logger.error({ err, episodeId: dbEpisodeId }, 'Audio download failed')
      jobStore.addError(dbEpisodeId, err instanceof Error ? err.message : String(err))
      continue
    }

    try {
      // Whisper で文字起こし
      const segments = await transcribeAudio(audioPath)

      // DB に保存
      await transcriptRepo.bulkCreate(segments.map((s) => ({ episodeId: dbEpisodeId, ...s })))

      // Embedding → Qdrant
      const savedSegments = await transcriptRepo.findByEpisodeId(dbEpisodeId)
      if (savedSegments.length > 0) {
        const vectors = await searchCore.embedBatch(savedSegments.map((s) => s.text))
        await searchCore.upsertBatch(
          savedSegments.map((s, i) => ({
            id: String(s.id),
            vector: vectors[i],
            payload: { episodeId: dbEpisodeId }
          }))
        )
      }

      jobStore.incrementDone()
    } catch (err) {
      logger.error({ err, episodeId: dbEpisodeId }, 'Episode processing failed')
      jobStore.addError(dbEpisodeId, err instanceof Error ? err.message : String(err))
    } finally {
      await deleteAudio(audioPath)
    }
  }

  jobStore.complete()
}
