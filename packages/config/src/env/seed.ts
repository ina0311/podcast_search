import { z } from 'zod'

const SeedEnvSchema = z.object({
  DATABASE_URL: z.url()
})

export type SeedEnv = z.infer<typeof SeedEnvSchema>

/**
 * Seed用の環境変数を取得
 * DATABASE_URLのみを検証します
 *
 * @throws {z.ZodError} DATABASE_URLが未設定または不正な場合
 */
export const getSeedEnv = (): SeedEnv => SeedEnvSchema.parse(process.env)
