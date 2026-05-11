jest.mock('@podcast_search/database', () => ({
  PodcastRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn()
  })),
  EpisodeRepository: jest.fn().mockImplementation(() => ({
    upsertByEnclosureUrl: jest.fn()
  })),
  TranscriptRepository: jest.fn().mockImplementation(() => ({
    countByEpisodeId: jest.fn(),
    bulkCreate: jest.fn(),
    findByEpisodeId: jest.fn()
  }))
}))

jest.mock('@podcast_search/search-core', () => ({
  createSearchCoreFromEnv: jest.fn().mockReturnValue({
    embedBatch: jest.fn(),
    upsertBatch: jest.fn()
  })
}))

jest.mock('../../services/rss/rss-fetcher', () => ({
  fetchRssEpisodes: jest.fn()
}))

jest.mock('../../services/transcription/audio-downloader', () => ({
  downloadAudio: jest.fn(),
  deleteAudio: jest.fn()
}))

jest.mock('../../services/transcription/whisper-runner', () => ({
  transcribeAudio: jest.fn()
}))

jest.mock('./job-store', () => ({
  jobStore: {
    getState: jest.fn(() => ({ status: 'idle', total: 0, done: 0, errors: [] })),
    start: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    incrementDone: jest.fn(),
    addError: jest.fn()
  }
}))

import {
  EpisodeRepository,
  PodcastRepository,
  TranscriptRepository
} from '@podcast_search/database'
import { createSearchCoreFromEnv } from '@podcast_search/search-core'
import { fetchRssEpisodes } from '../../services/rss/rss-fetcher'
import { deleteAudio, downloadAudio } from '../../services/transcription/audio-downloader'
import { transcribeAudio } from '../../services/transcription/whisper-runner'
import { jobStore } from './job-store'

describe('runImport', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rssUrl がないポッドキャストはスキップする', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(
      () =>
        ({
          findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: null, title: 'No RSS' }])
        }) as any
    )

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(fetchRssEpisodes).not.toHaveBeenCalled()
    expect(jobStore.complete).toHaveBeenCalled()
  })

  it('RSS フェッチ失敗時はスキップして complete を呼ぶ', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(
      () =>
        ({
          findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }])
        }) as any
    )
    jest.mocked(fetchRssEpisodes).mockRejectedValueOnce(new Error('network error'))

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(jobStore.start).toHaveBeenCalledWith(0)
    expect(jobStore.complete).toHaveBeenCalled()
  })

  it('episode upsert 失敗時は addError してスキップする', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(
      () =>
        ({
          findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }])
        }) as any
    )
    jest.mocked(fetchRssEpisodes).mockResolvedValueOnce([
      {
        title: 'Ep1',
        enclosureUrl: 'url',
        audioUrl: 'https://ex.mp3',
        publishedAt: null,
        durationSec: null,
        description: null
      }
    ])
    jest.mocked(EpisodeRepository).mockImplementationOnce(
      () =>
        ({
          upsertByEnclosureUrl: jest.fn().mockRejectedValue(new Error('db error'))
        }) as any
    )

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(jobStore.addError).toHaveBeenCalledWith(-1, 'db error')
    expect(downloadAudio).not.toHaveBeenCalled()
  })

  it('音声ダウンロード失敗時は addError してスキップする', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(
      () =>
        ({
          findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }])
        }) as any
    )
    jest.mocked(fetchRssEpisodes).mockResolvedValueOnce([
      {
        title: 'Ep1',
        enclosureUrl: 'url',
        audioUrl: 'https://ex.mp3',
        publishedAt: null,
        durationSec: null,
        description: null
      }
    ])
    jest.mocked(EpisodeRepository).mockImplementationOnce(
      () =>
        ({
          upsertByEnclosureUrl: jest.fn().mockResolvedValue({ id: 10 })
        }) as any
    )
    jest.mocked(TranscriptRepository).mockImplementationOnce(
      () =>
        ({
          countByEpisodeId: jest.fn().mockResolvedValue(0),
          bulkCreate: jest.fn(),
          findByEpisodeId: jest.fn()
        }) as any
    )
    jest.mocked(downloadAudio).mockRejectedValueOnce(new Error('download failed'))

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(jobStore.addError).toHaveBeenCalledWith(10, 'download failed')
    expect(transcribeAudio).not.toHaveBeenCalled()
  })

  it('whisper 失敗時も deleteAudio を呼ぶ', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(
      () =>
        ({
          findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }])
        }) as any
    )
    jest.mocked(fetchRssEpisodes).mockResolvedValueOnce([
      {
        title: 'Ep1',
        enclosureUrl: 'url',
        audioUrl: 'https://ex.mp3',
        publishedAt: null,
        durationSec: null,
        description: null
      }
    ])
    jest.mocked(EpisodeRepository).mockImplementationOnce(
      () =>
        ({
          upsertByEnclosureUrl: jest.fn().mockResolvedValue({ id: 10 })
        }) as any
    )
    jest.mocked(TranscriptRepository).mockImplementationOnce(
      () =>
        ({
          countByEpisodeId: jest.fn().mockResolvedValue(0),
          bulkCreate: jest.fn(),
          findByEpisodeId: jest.fn()
        }) as any
    )
    jest.mocked(downloadAudio).mockResolvedValueOnce('/tmp/ep-10.mp3')
    jest.mocked(transcribeAudio).mockRejectedValueOnce(new Error('whisper error'))

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(jobStore.addError).toHaveBeenCalledWith(10, 'whisper error')
    expect(deleteAudio).toHaveBeenCalledWith('/tmp/ep-10.mp3')
  })

  it('既に文字起こし済みのエピソードはスキップする', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(
      () =>
        ({
          findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }])
        }) as any
    )
    jest.mocked(fetchRssEpisodes).mockResolvedValueOnce([
      {
        title: 'Ep1',
        enclosureUrl: 'https://anchor.fm/play/1/https%3A%2F%2Fex.mp3',
        audioUrl: 'https://ex.mp3',
        publishedAt: null,
        durationSec: null,
        description: null
      }
    ])
    jest.mocked(EpisodeRepository).mockImplementationOnce(
      () =>
        ({
          upsertByEnclosureUrl: jest.fn().mockResolvedValue({ id: 10 })
        }) as any
    )
    jest.mocked(TranscriptRepository).mockImplementationOnce(
      () =>
        ({
          countByEpisodeId: jest.fn().mockResolvedValue(5),
          bulkCreate: jest.fn(),
          findByEpisodeId: jest.fn()
        }) as any
    )

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(downloadAudio).not.toHaveBeenCalled()
    expect(jobStore.incrementDone).toHaveBeenCalled()
  })
})
