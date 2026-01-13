import type { DbClient } from '../client'
import { prisma } from '../client'

export abstract class BaseRepository {
  constructor(protected readonly db: DbClient = prisma) {}
}
