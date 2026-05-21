import type { PersonalityAudioSample } from '../generated/prisma/client'
import { BaseRepository } from './base'

export interface CreateSampleInput {
  personalityId: number
  storageUrl: string
  durationSec?: number | null
}

export class PersonalityAudioSampleRepository extends BaseRepository {
  async findById(id: number): Promise<PersonalityAudioSample | null> {
    return this.db.personalityAudioSample.findUnique({ where: { id } })
  }

  async findByPersonalityId(personalityId: number): Promise<PersonalityAudioSample[]> {
    return this.db.personalityAudioSample.findMany({ where: { personalityId } })
  }

  async create(input: CreateSampleInput): Promise<PersonalityAudioSample> {
    return this.db.personalityAudioSample.create({ data: input })
  }

  async updateEmbedding(id: number, embedding: number[]): Promise<void> {
    await this.db.personalityAudioSample.update({
      where: { id },
      data: { embedding }
    })
  }

  async delete(id: number): Promise<void> {
    await this.db.personalityAudioSample.delete({ where: { id } })
  }
}
