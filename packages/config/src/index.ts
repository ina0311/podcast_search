import { config as loadEnv } from 'dotenv'
import { z } from 'zod'

// 定数（副作用なしでimport可能）
export const DEFAULT_API_PORT = 3000

// 環境変数のパースは遅延評価
let _env: Env | null = null

const optionalNonEmptyString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined
  }
  return value
}, z.string().min(1).optional())

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(DEFAULT_API_PORT),
  DATABASE_URL: z.string().url(),
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: optionalNonEmptyString,
  OPENAI_API_KEY: optionalNonEmptyString
})

export type Env = z.infer<typeof EnvSchema>

// 遅延評価: envにアクセスした時に初めてパース実行
export const env: Env = new Proxy({} as Env, {
  get(_, prop: keyof Env) {
    if (!_env) {
      loadEnv()
      _env = EnvSchema.parse(process.env)
    }
    return _env[prop]
  }
})
