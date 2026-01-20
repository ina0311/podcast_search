import { z } from 'zod'

export const DEFAULT_API_PORT = 3000

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(DEFAULT_API_PORT),
  DATABASE_URL: z.url(),
  QDRANT_URL: z.url().optional(),
  QDRANT_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().optional()
})

export type Env = z.infer<typeof EnvSchema>

/**
 * 検証済みの環境変数オブジェクト
 * モジュール読み込み時に自動的に環境変数を検証します
 *
 * @throws {z.ZodError} 環境変数の検証に失敗した場合
 */
export const env: Env = EnvSchema.parse(process.env)
