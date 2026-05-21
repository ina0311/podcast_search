import type { Personality, PersonalityAudioSample } from '../generated/prisma/client'
import { BaseRepository } from './base'

export type PersonalityWithSamples = Personality & {
  audioSamples: PersonalityAudioSample[]
}

export interface CreatePersonalityInput {
  name: string
  description?: string | null
}

export class PersonalityRepository extends BaseRepository {
  async findById(id: number): Promise<PersonalityWithSamples | null> {
    return this.db.personality.findUnique({
      where: { id },
      include: { audioSamples: true }
    })
  }

  async findByPublicId(publicId: string): Promise<PersonalityWithSamples | null> {
    return this.db.personality.findUnique({
      where: { publicId },
      include: { audioSamples: true }
    })
  }

  async findMany(): Promise<PersonalityWithSamples[]> {
    return this.db.personality.findMany({
      include: { audioSamples: true },
      orderBy: { name: 'asc' }
    })
  }

  async findByPodcastId(podcastId: number): Promise<PersonalityWithSamples[]> {
    const rows = await this.db.personalityPodcast.findMany({
      where: { podcastId },
      include: { personality: { include: { audioSamples: true } } }
    })
    return rows.map((r) => r.personality)
  }

  async findByEpisodeId(episodeId: number): Promise<PersonalityWithSamples[]> {
    const rows = await this.db.episodePersonality.findMany({
      where: { episodeId },
      include: { personality: { include: { audioSamples: true } } }
    })
    return rows.map((r) => r.personality)
  }

  async findPersonalitiesForTranscription(opts: {
    podcastId: number
    episodeId: number
  }): Promise<PersonalityWithSamples[]> {
    const episodePersonalities = await this.findByEpisodeId(opts.episodeId)
    if (episodePersonalities.length > 0) return episodePersonalities
    return this.findByPodcastId(opts.podcastId)
  }

  async create(input: CreatePersonalityInput): Promise<Personality> {
    return this.db.personality.create({ data: input })
  }

  async update(id: number, input: Partial<CreatePersonalityInput>): Promise<Personality> {
    return this.db.personality.update({ where: { id }, data: input })
  }

  async delete(id: number): Promise<void> {
    await this.db.personality.delete({ where: { id } })
  }

  async addToPodcast(personalityId: number, podcastId: number, role?: string): Promise<void> {
    await this.db.personalityPodcast.upsert({
      where: { personalityId_podcastId: { personalityId, podcastId } },
      create: { personalityId, podcastId, role },
      update: { role }
    })
  }

  async removeFromPodcast(personalityId: number, podcastId: number): Promise<void> {
    await this.db.personalityPodcast.delete({
      where: { personalityId_podcastId: { personalityId, podcastId } }
    })
  }

  async addToEpisode(personalityId: number, episodeId: number, role?: string): Promise<void> {
    await this.db.episodePersonality.upsert({
      where: { personalityId_episodeId: { personalityId, episodeId } },
      create: { personalityId, episodeId, role },
      update: { role }
    })
  }

  async removeFromEpisode(personalityId: number, episodeId: number): Promise<void> {
    await this.db.episodePersonality.delete({
      where: { personalityId_episodeId: { personalityId, episodeId } }
    })
  }
}
