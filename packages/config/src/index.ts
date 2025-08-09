import { z } from 'zod';
import { config as loadEnv } from 'dotenv';

loadEnv();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  QDRANT_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof EnvSchema>;

export const env: Env = EnvSchema.parse(process.env);


