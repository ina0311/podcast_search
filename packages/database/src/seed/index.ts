import { PrismaPg } from '@prisma/adapter-pg'
import { getSeedEnv } from '../../../config/src/env/seed'
import { PrismaClient } from '../generated/prisma/client'

import { episodes, podcasts, transcripts } from './data'

const { DATABASE_URL } = getSeedEnv()

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

/**
 * データベースをシードする
 * 既存データを削除してから新しいデータを挿入
 */
async function seed(): Promise<void> {
  console.log('🌱 Seeding database...')

  // 既存データを削除（外部キー制約のため順番に削除）
  console.log('  Cleaning existing data...')
  await prisma.transcriptSegment.deleteMany()
  await prisma.podcastEpisode.deleteMany()
  await prisma.podcast.deleteMany()

  // Podcast を作成
  console.log('  Creating podcasts...')
  const createdPodcasts = await Promise.all(
    podcasts.map((podcast) =>
      prisma.podcast.create({
        data: podcast
      })
    )
  )
  console.log(`    Created ${createdPodcasts.length} podcasts`)

  // Episode を作成
  console.log('  Creating episodes...')
  const createdEpisodes = await Promise.all(
    episodes.map((episode) => {
      const { podcastIndex, ...data } = episode
      return prisma.podcastEpisode.create({
        data: {
          ...data,
          podcastId: createdPodcasts[podcastIndex].id
        }
      })
    })
  )
  console.log(`    Created ${createdEpisodes.length} episodes`)

  // TranscriptSegment を作成
  console.log('  Creating transcript segments...')
  let segmentCount = 0
  for (const transcript of transcripts) {
    const episodeId = createdEpisodes[transcript.episodeIndex].id
    await prisma.transcriptSegment.createMany({
      data: transcript.segments.map((segment) => ({
        ...segment,
        episodeId,
        language: transcript.episodeIndex === 2 ? 'ja' : 'en'
      }))
    })
    segmentCount += transcript.segments.length
  }
  console.log(`    Created ${segmentCount} transcript segments`)

  console.log('✅ Seeding completed!')
}

/**
 * シードを実行
 */
async function main(): Promise<void> {
  try {
    await seed()
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
