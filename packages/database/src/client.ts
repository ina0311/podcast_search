import { env } from '@podcast_search/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { type Prisma, PrismaClient } from './generated/prisma/client'

/** 通常のクライアントまたはトランザクションクライアント */
export type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * PostgreSQL用ドライバーアダプター
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL
})

/**
 * PrismaClientのシングルトンインスタンス
 * ESモジュールはキャッシュされるため、グローバル変数は不要
 */
export const prisma = new PrismaClient({ adapter })
