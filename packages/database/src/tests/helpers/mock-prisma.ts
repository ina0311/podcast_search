import type { Prisma } from '../../generated/prisma/client'
import type { EpisodeStatus } from '../../generated/prisma/enums'

type EmptyPayload = Record<string, never>

export interface MockPrismaClient {
  podcast: {
    findUnique: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
  podcastEpisode: {
    findUnique: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
  transcriptSegment: {
    findUnique: jest.Mock
    findMany: jest.Mock
    count: jest.Mock
    create: jest.Mock
    createMany: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
  $transaction: jest.Mock
  $connect: jest.Mock
  $disconnect: jest.Mock
}

export const createMockPrismaClient = (): MockPrismaClient => {
  return {
    podcast: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    podcastEpisode: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    transcriptSegment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  } as unknown as MockPrismaClient
}

export const createMockPodcast = (overrides?: Partial<Prisma.PodcastGetPayload<EmptyPayload>>) => ({
  id: 1,
  publicId: 'podcast-123',
  title: 'Test Podcast',
  rssUrl: 'https://example.com/rss',
  author: 'Test Author',
  language: 'ja',
  imageUrl: 'https://example.com/image.jpg',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

export const createMockEpisode = (
  overrides?: Partial<Prisma.PodcastEpisodeGetPayload<EmptyPayload>>
) => ({
  id: 1,
  publicId: 'episode-123',
  podcastId: 1,
  title: 'Test Episode',
  enclosureUrl: 'https://example.com/episode.mp3',
  status: 'PUBLISHED' as EpisodeStatus,
  visibilityChangedAt: null,
  publishedAt: new Date('2024-01-01'),
  durationSec: 3600,
  description: 'Test Description',
  source: 'test',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})

export const createMockTranscript = (
  overrides?: Partial<Prisma.TranscriptSegmentGetPayload<EmptyPayload>>
) => ({
  id: 1,
  publicId: 'transcript-123',
  episodeId: 1,
  text: 'Test transcript text',
  startMs: 0,
  endMs: 1000,
  language: 'ja',
  speakerLabel: 'speaker1',
  confidence: 0.95,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
})
