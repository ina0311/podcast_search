# Personality Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ポッドキャストのパーソナリティ（出演者）を管理できるようにする。番組デフォルトとエピソード個別の両方で出演者を設定でき、任意でサンプル音声と声の特徴をアップロードできる。

**Architecture:** Personality（出演者）は複数の Podcast と多対多で紐づく（PersonalityPodcast）。エピソードごとに個別設定（EpisodePersonality）が可能で未設定なら番組デフォルトにフォールバックする。サンプル音声は Supabase Storage に保存し、voice embedding は DB に JSON として保存する。

**Tech Stack:** Prisma 6（multi-file schema）、Hono、@supabase/supabase-js（Storage）、React + Tailwind（Admin UI）

---

## ファイル構成

| ファイル | 作成/変更 |
|---------|---------|
| `packages/database/src/prisma/models/personality.prisma` | 新規 |
| `packages/database/src/prisma/models/personality-podcast.prisma` | 新規 |
| `packages/database/src/prisma/models/episode-personality.prisma` | 新規 |
| `packages/database/src/prisma/models/personality-audio-sample.prisma` | 新規 |
| `packages/database/src/prisma/models/podcast.prisma` | 修正（relations追加） |
| `packages/database/src/prisma/models/episode.prisma` | 修正（relations追加） |
| `packages/database/src/repositories/personality.ts` | 新規 |
| `packages/database/src/repositories/personality-audio-sample.ts` | 新規 |
| `packages/database/src/repositories/index.ts` | 修正 |
| `packages/database/src/index.ts` | 修正 |
| `packages/config/src/env/common.ts` | 修正（Supabase Storage URL/key追加） |
| `apps/api/src/lib/supabase.ts` | 新規 |
| `apps/api/src/routes/personalities.ts` | 新規 |
| `apps/api/src/routes/personalities.test.ts` | 新規 |
| `apps/api/src/index.ts` | 修正 |
| `apps/admin-ui/src/api/personalities.ts` | 新規 |
| `apps/admin-ui/src/api/index.ts` | 修正 |
| `apps/admin-ui/src/pages/PersonalityList.tsx` | 新規 |
| `apps/admin-ui/src/pages/PersonalityDetail.tsx` | 新規 |
| `apps/admin-ui/src/pages/PodcastDetail.tsx` | 修正 |
| `apps/admin-ui/src/pages/EpisodeDetail.tsx` | 修正 |
| `apps/admin-ui/src/App.tsx` | 修正 |

---

## Task 1: Prisma スキーマ追加 (packages/)

**Files:**
- Create: `packages/database/src/prisma/models/personality.prisma`
- Create: `packages/database/src/prisma/models/personality-podcast.prisma`
- Create: `packages/database/src/prisma/models/episode-personality.prisma`
- Create: `packages/database/src/prisma/models/personality-audio-sample.prisma`
- Modify: `packages/database/src/prisma/models/podcast.prisma`
- Modify: `packages/database/src/prisma/models/episode.prisma`

- [ ] **Step 1: personality.prisma を作成**

```prisma
// packages/database/src/prisma/models/personality.prisma
model Personality {
  id           Int      @id @default(autoincrement())
  publicId     String   @unique @default(uuid()) @db.Uuid
  name         String
  description  String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  podcasts     PersonalityPodcast[]
  episodes     EpisodePersonality[]
  audioSamples PersonalityAudioSample[]
}
```

- [ ] **Step 2: personality-podcast.prisma を作成**

```prisma
// packages/database/src/prisma/models/personality-podcast.prisma
model PersonalityPodcast {
  personalityId Int
  podcastId     Int
  role          String?  // "host" | "co-host" | "guest"
  createdAt     DateTime @default(now())

  personality   Personality @relation(fields: [personalityId], references: [id], onDelete: Cascade)
  podcast       Podcast     @relation(fields: [podcastId], references: [id], onDelete: Cascade)

  @@id([personalityId, podcastId])
}
```

- [ ] **Step 3: episode-personality.prisma を作成**

```prisma
// packages/database/src/prisma/models/episode-personality.prisma
model EpisodePersonality {
  personalityId Int
  episodeId     Int
  role          String?  // "host" | "co-host" | "guest"
  createdAt     DateTime @default(now())

  personality   Personality    @relation(fields: [personalityId], references: [id], onDelete: Cascade)
  episode       PodcastEpisode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@id([personalityId, episodeId])
}
```

- [ ] **Step 4: personality-audio-sample.prisma を作成**

```prisma
// packages/database/src/prisma/models/personality-audio-sample.prisma
model PersonalityAudioSample {
  id            Int         @id @default(autoincrement())
  publicId      String      @unique @default(uuid()) @db.Uuid
  personalityId Int
  storageUrl    String      // Supabase Storage の公開 URL
  durationSec   Float?
  embedding     Json?       // Float[] として保存。未計算なら null
  createdAt     DateTime    @default(now())

  personality   Personality @relation(fields: [personalityId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 5: podcast.prisma にリレーションを追加**

既存の `episodes  PodcastEpisode[]` の下に追記：

```prisma
  personalities PersonalityPodcast[]
```

- [ ] **Step 6: episode.prisma にリレーションを追加**

既存の `transcripts  TranscriptSegment[]` の下に追記：

```prisma
  episodePersonalities EpisodePersonality[]
```

- [ ] **Step 7: マイグレーション実行**

```bash
pnpm db:migrate
# プロンプトが出たら名前を入力: add_personality_tables
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 8: 型生成確認**

```bash
pnpm -C packages/database run prisma:generate
pnpm typecheck 2>&1 | grep "error TS" | grep -v "search.ts\|rss-fetcher"
```

Expected: 追加エラーなし

- [ ] **Step 9: コミット**

```bash
git add packages/database/src/prisma/
git commit -m "feat: Personality / PersonalityPodcast / EpisodePersonality / PersonalityAudioSample スキーマを追加"
```

---

## Task 2: Repository 実装 (packages/)

**Files:**
- Create: `packages/database/src/repositories/personality.ts`
- Create: `packages/database/src/repositories/personality-audio-sample.ts`
- Modify: `packages/database/src/repositories/index.ts`
- Modify: `packages/database/src/index.ts`

- [ ] **Step 1: PersonalityRepository テストを書く**

```typescript
// packages/database/src/repositories/__tests__/personality.test.ts
import { PersonalityRepository } from '../personality'

jest.mock('../client', () => ({ prisma: { personality: {} } }))

describe('PersonalityRepository', () => {
  let repo: PersonalityRepository
  let mockDb: any

  beforeEach(() => {
    mockDb = {
      personality: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      personalityPodcast: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn()
      },
      episodePersonality: {
        findMany: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn()
      }
    }
    repo = new PersonalityRepository(mockDb)
  })

  it('findByPodcastId は podcastId に紐づく Personality を返す', async () => {
    mockDb.personalityPodcast.findMany.mockResolvedValue([
      { personality: { id: 1, name: 'ホスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findByPodcastId(10)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ホスト')
  })

  it('findByEpisodeId はエピソード個別設定を返す', async () => {
    mockDb.episodePersonality.findMany.mockResolvedValue([
      { personality: { id: 2, name: 'ゲスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findByEpisodeId(5)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('ゲスト')
  })

  it('findPersonalitiesForTranscription はエピソード優先でフォールバックする', async () => {
    // Episode-level personalities take priority
    mockDb.episodePersonality.findMany.mockResolvedValueOnce([
      { personality: { id: 2, name: 'ゲスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findPersonalitiesForTranscription({ podcastId: 1, episodeId: 5 })
    expect(result[0].name).toBe('ゲスト')
    expect(mockDb.personalityPodcast.findMany).not.toHaveBeenCalled()
  })

  it('findPersonalitiesForTranscription はエピソード設定なしの場合 podcastId のものを返す', async () => {
    mockDb.episodePersonality.findMany.mockResolvedValueOnce([])
    mockDb.personalityPodcast.findMany.mockResolvedValueOnce([
      { personality: { id: 1, name: 'ホスト', description: null, audioSamples: [] } }
    ])
    const result = await repo.findPersonalitiesForTranscription({ podcastId: 1, episodeId: 5 })
    expect(result[0].name).toBe('ホスト')
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPatterns="personality.test" 2>&1 | tail -10
```

Expected: `FAIL` (PersonalityRepository not defined)

- [ ] **Step 3: PersonalityRepository を実装**

```typescript
// packages/database/src/repositories/personality.ts
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
```

- [ ] **Step 4: PersonalityAudioSampleRepository を実装**

```typescript
// packages/database/src/repositories/personality-audio-sample.ts
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
```

- [ ] **Step 5: repositories/index.ts に追記**

```typescript
// 既存の export に追加
export * from './personality'
export * from './personality-audio-sample'
```

- [ ] **Step 6: packages/database/src/index.ts に型を追記**

```typescript
// 既存の export type { Podcast, PodcastEpisode, TranscriptSegment } に追加
export type {
  Podcast,
  PodcastEpisode,
  Personality,
  PersonalityAudioSample,
  TranscriptSegment
} from './generated/prisma/client'
```

- [ ] **Step 7: テスト実行**

```bash
npx jest --testPathPatterns="personality.test" 2>&1 | tail -20
```

Expected: `PASS` (4 tests)

- [ ] **Step 8: コミット**

```bash
git add packages/database/src/repositories/
git commit -m "feat: PersonalityRepository と PersonalityAudioSampleRepository を追加"
```

---

## Task 3: 環境変数 + Supabase Storage クライアント (apps/)

**Files:**
- Modify: `packages/config/src/env/common.ts`
- Create: `apps/api/src/lib/supabase.ts`

**事前準備:** `apps/api` に `@supabase/supabase-js` を追加する

```bash
pnpm -C apps/api add @supabase/supabase-js
```

- [ ] **Step 1: 環境変数定義を追加**

`packages/config/src/env/common.ts` の既存フィールドの末尾（`ALLOWED_ORIGINS` の後）に追加：

```typescript
SUPABASE_URL: z.string().url().optional(),
SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
SUPABASE_STORAGE_BUCKET: z.string().default('personality-audio-samples'),
```

- [ ] **Step 2: Supabase クライアントを作成**

```typescript
// apps/api/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { env } from '@podcast_search/config'

export function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL and service role key are required for storage operations')
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function uploadAudioSample(
  file: ArrayBuffer,
  filename: string
): Promise<string> {
  const supabase = getSupabaseClient()
  const bucket = env.SUPABASE_STORAGE_BUCKET

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, file, { contentType: 'audio/mpeg', upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename)
  return data.publicUrl
}

export async function deleteAudioSample(filename: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .remove([filename])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
```

- [ ] **Step 3: ローカル .env.local に Supabase Storage 設定を追加**

`.env.local`（コミット不要）に追記：
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=<supabase start 実行後に表示される service_role key>
SUPABASE_STORAGE_BUCKET=personality-audio-samples
```

Supabase CLI で確認：
```bash
supabase status | grep service_role
```

- [ ] **Step 4: Supabase Storage にバケットを作成（ローカル）**

```bash
# supabase が起動している状態で実行
supabase storage create personality-audio-samples --public
```

Expected: `Created storage bucket personality-audio-samples`

- [ ] **Step 5: コミット**

```bash
git add packages/config/src/env/common.ts apps/api/src/lib/supabase.ts
git commit -m "feat: Supabase Storage クライアントと環境変数を追加"
```

---

## Task 4: Personality API ルート (apps/)

**Files:**
- Create: `apps/api/src/routes/personalities.ts`
- Create: `apps/api/src/routes/personalities.test.ts`
- Modify: `apps/api/src/index.ts`

- [ ] **Step 1: テストを書く**

```typescript
// apps/api/src/routes/personalities.test.ts
jest.mock('@podcast_search/database', () => ({
  PersonalityRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn().mockResolvedValue([]),
    findByPublicId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    addToPodcast: jest.fn(),
    removeFromPodcast: jest.fn(),
    addToEpisode: jest.fn(),
    removeFromEpisode: jest.fn(),
    findByPodcastId: jest.fn().mockResolvedValue([]),
    findByEpisodeId: jest.fn().mockResolvedValue([])
  })),
  PersonalityAudioSampleRepository: jest.fn().mockImplementation(() => ({
    create: jest.fn(),
    delete: jest.fn()
  }))
}))
jest.mock('../lib/supabase', () => ({
  uploadAudioSample: jest.fn().mockResolvedValue('https://example.com/sample.mp3'),
  deleteAudioSample: jest.fn()
}))
jest.mock('../middleware/auth', () => ({
  adminAuth: (_c: any, next: any) => next()
}))

import { Hono } from 'hono'
import { PersonalityRepository } from '@podcast_search/database'

describe('personalities routes', () => {
  let app: Hono
  beforeEach(async () => {
    jest.clearAllMocks()
    const { default: router } = await import('./personalities')
    app = new Hono().route('/personalities', router)
  })

  it('GET /personalities は 200 を返す', async () => {
    const res = await app.request('/personalities')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('POST /personalities は 201 を返す', async () => {
    jest.mocked(PersonalityRepository).mockImplementationOnce(
      () => ({ create: jest.fn().mockResolvedValue({ id: 1, publicId: 'uuid', name: 'テスト', description: null }) }) as any
    )
    const res = await app.request('/personalities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'テスト' })
    })
    expect(res.status).toBe(201)
  })

  it('POST /personalities - name なしは 400', async () => {
    const res = await app.request('/personalities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest --testPathPatterns="personalities.test" 2>&1 | tail -10
```

Expected: `FAIL`

- [ ] **Step 3: personalities.ts ルートを実装**

```typescript
// apps/api/src/routes/personalities.ts
import { PersonalityAudioSampleRepository, PersonalityRepository } from '@podcast_search/database'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { deleteAudioSample, uploadAudioSample } from '../lib/supabase'

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
})
const updateSchema = createSchema.partial()

const router = new Hono()
  .get('/', async (c) => {
    const repo = new PersonalityRepository()
    return c.json(await repo.findMany())
  })
  .post('/', async (c) => {
    const raw = await c.req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    const personality = await repo.create(parsed.data)
    return c.json(personality, 201)
  })
  .get('/:publicId', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })
    return c.json(p)
  })
  .patch('/:publicId', async (c) => {
    const raw = await c.req.json().catch(() => ({}))
    const parsed = updateSchema.safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })
    return c.json(await repo.update(p.id, parsed.data))
  })
  .delete('/:publicId', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })
    await repo.delete(p.id)
    return c.body(null, 204)
  })
  // 音声サンプルアップロード
  .post('/:publicId/samples', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })

    const form = await c.req.formData()
    const file = form.get('file') as File | null
    if (!file) return c.json({ error: 'file is required' }, 400)

    const filename = `${p.publicId}/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const buffer = await file.arrayBuffer()
    const storageUrl = await uploadAudioSample(buffer, filename)

    const sampleRepo = new PersonalityAudioSampleRepository()
    const sample = await sampleRepo.create({
      personalityId: p.id,
      storageUrl,
      durationSec: null
    })
    return c.json(sample, 201)
  })
  .delete('/:publicId/samples/:sampleId', async (c) => {
    const repo = new PersonalityRepository()
    const p = await repo.findByPublicId(c.req.param('publicId'))
    if (!p) throw new HTTPException(404, { message: 'Personality not found' })

    const sampleRepo = new PersonalityAudioSampleRepository()
    const sample = await sampleRepo.findById(Number(c.req.param('sampleId')))
    if (!sample || sample.personalityId !== p.id) {
      throw new HTTPException(404, { message: 'Sample not found' })
    }

    // URL から storage パスを抽出して削除
    const url = new URL(sample.storageUrl)
    const pathParts = url.pathname.split('/object/public/')
    if (pathParts[1]) {
      const storagePath = pathParts[1].split('/').slice(1).join('/')
      await deleteAudioSample(storagePath)
    }
    await sampleRepo.delete(sample.id)
    return c.body(null, 204)
  })
  // Podcast / Episode のパーソナリティ一覧（GETは query param で id を受け取る）
  .get('/by-podcast', async (c) => {
    const podcastId = Number(c.req.query('podcastId'))
    if (Number.isNaN(podcastId)) return c.json({ error: 'podcastId required' }, 400)
    const repo = new PersonalityRepository()
    return c.json(await repo.findByPodcastId(podcastId))
  })
  .get('/by-episode', async (c) => {
    const episodeId = Number(c.req.query('episodeId'))
    if (Number.isNaN(episodeId)) return c.json({ error: 'episodeId required' }, 400)
    const repo = new PersonalityRepository()
    return c.json(await repo.findByEpisodeId(episodeId))
  })
  .post('/by-podcast/:podcastId', async (c) => {
    const podcastId = Number(c.req.param('podcastId'))
    const raw = await c.req.json().catch(() => ({}))
    const parsed = z.object({ personalityId: z.number(), role: z.string().optional() }).safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    await repo.addToPodcast(parsed.data.personalityId, podcastId, parsed.data.role)
    return c.body(null, 204)
  })
  .delete('/by-podcast/:podcastId/:personalityId', async (c) => {
    const repo = new PersonalityRepository()
    await repo.removeFromPodcast(
      Number(c.req.param('personalityId')),
      Number(c.req.param('podcastId'))
    )
    return c.body(null, 204)
  })
  // Episode への紐付け
  .post('/by-episode/:episodeId', async (c) => {
    const episodeId = Number(c.req.param('episodeId'))
    const raw = await c.req.json().catch(() => ({}))
    const parsed = z.object({ personalityId: z.number(), role: z.string().optional() }).safeParse(raw)
    if (!parsed.success) return c.json({ error: 'Invalid body' }, 400)
    const repo = new PersonalityRepository()
    await repo.addToEpisode(parsed.data.personalityId, episodeId, parsed.data.role)
    return c.body(null, 204)
  })
  .delete('/by-episode/:episodeId/:personalityId', async (c) => {
    const repo = new PersonalityRepository()
    await repo.removeFromEpisode(
      Number(c.req.param('personalityId')),
      Number(c.req.param('episodeId'))
    )
    return c.body(null, 204)
  })

export default router
```

- [ ] **Step 4: apps/api/src/index.ts にルートを登録**

`adminRouter` の `.route` の後に追加：

```typescript
import personalitiesRouter from './routes/personalities'
// ...
const app = new Hono()
  .get('/health', ...)
  .route('/podcasts', podcastsRouter)
  .route('/episodes', episodesRouter)
  .route('/search', searchRouter)
  .route('/admin', adminRouter)
  .route('/personalities', personalitiesRouter)  // 追加
```

`adminAuth` の適用範囲を personalities にも追加：

```typescript
app.use('/admin/*', adminAuth)
app.use('/personalities/*', adminAuth)  // 追加
```

- [ ] **Step 5: テスト実行**

```bash
npx jest --testPathPatterns="personalities.test" 2>&1 | tail -20
```

Expected: `PASS`

- [ ] **Step 6: コミット**

```bash
git add apps/api/src/routes/personalities.ts apps/api/src/routes/personalities.test.ts apps/api/src/index.ts
git commit -m "feat: /personalities API ルートを追加（CRUD + 音声サンプルアップロード + Podcast/Episode 紐付け）"
```

---

## Task 5: Admin UI - Personality 管理ページ (apps/)

**Files:**
- Create: `apps/admin-ui/src/api/personalities.ts`
- Create: `apps/admin-ui/src/pages/PersonalityList.tsx`
- Create: `apps/admin-ui/src/pages/PersonalityDetail.tsx`
- Modify: `apps/admin-ui/src/api/index.ts`
- Modify: `apps/admin-ui/src/App.tsx`

- [ ] **Step 1: API クライアントを作成**

```typescript
// apps/admin-ui/src/api/personalities.ts
const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY ?? ''

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': adminApiKey
})

export interface Personality {
  id: number
  publicId: string
  name: string
  description: string | null
  audioSamples: { id: number; publicId: string; storageUrl: string }[]
}

export const fetchPersonalities = async (): Promise<Personality[]> => {
  const res = await fetch(`${apiBaseUrl}/personalities`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch personalities')
  return res.json()
}

export const fetchPersonality = async (publicId: string): Promise<Personality> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch personality')
  return res.json()
}

export const createPersonality = async (data: { name: string; description?: string }): Promise<Personality> => {
  const res = await fetch(`${apiBaseUrl}/personalities`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create personality')
  return res.json()
}

export const updatePersonality = async (publicId: string, data: { name?: string; description?: string }): Promise<Personality> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update personality')
  return res.json()
}

export const deletePersonality = async (publicId: string): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to delete personality')
}

export const uploadAudioSample = async (publicId: string, file: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}/samples`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminApiKey },
    body: formData
  })
  if (!res.ok) throw new Error('Failed to upload sample')
}

export const deleteAudioSample = async (personalityPublicId: string, sampleId: number): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${personalityPublicId}/samples/${sampleId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to delete sample')
}

export const addPersonalityToPodcast = async (podcastId: number, personalityId: number, role?: string): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-podcast/${podcastId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ personalityId, role })
  })
  if (!res.ok) throw new Error('Failed to add personality to podcast')
}

export const removePersonalityFromPodcast = async (podcastId: number, personalityId: number): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-podcast/${podcastId}/${personalityId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to remove personality from podcast')
}

export const addPersonalityToEpisode = async (episodeId: number, personalityId: number, role?: string): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-episode/${episodeId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ personalityId, role })
  })
  if (!res.ok) throw new Error('Failed to add personality to episode')
}

export const removePersonalityFromEpisode = async (episodeId: number, personalityId: number): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-episode/${episodeId}/${personalityId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to remove personality from episode')
}

export const fetchPersonalitiesByPodcast = async (podcastId: number): Promise<Personality[]> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-podcast?podcastId=${podcastId}`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch podcast personalities')
  return res.json()
}

export const fetchPersonalitiesByEpisode = async (episodeId: number): Promise<Personality[]> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-episode?episodeId=${episodeId}`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch episode personalities')
  return res.json()
}
```

- [ ] **Step 2: api/index.ts に追記**

```typescript
export * from './admin'
export * from './episodes'
export * from './personalities'  // 追加
export * from './podcasts'
export type { PodcastSearchResult } from './search'
export * from './search'
```

- [ ] **Step 3: PersonalityList.tsx を作成**

```typescript
// apps/admin-ui/src/pages/PersonalityList.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPersonality, fetchPersonalities } from '../api'

export default function PersonalityList() {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [showForm, setShowForm] = useState(false)

  const { data: personalities = [], isLoading } = useQuery({
    queryKey: ['personalities'],
    queryFn: fetchPersonalities
  })

  const createMutation = useMutation({
    mutationFn: () => createPersonality({ name: newName, description: newDesc || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personalities'] })
      setNewName('')
      setNewDesc('')
      setShowForm(false)
    }
  })

  if (isLoading) return <div className="text-center py-8">読み込み中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">パーソナリティ一覧</h2>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          + 新規追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold mb-3">新しいパーソナリティ</h3>
          <input
            type="text"
            placeholder="名前（必須）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-2"
          />
          <textarea
            placeholder="特徴・説明（任意）例: ホスト。低めのトーンで話す"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-3 h-20 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!newName || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              作成
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {personalities.map((p) => (
          <Link
            key={p.id}
            to={`/personalities/${p.publicId}`}
            className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{p.name}</span>
              <span className="text-xs text-gray-500">{p.audioSamples.length} サンプル</span>
            </div>
            {p.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-1">{p.description}</p>
            )}
          </Link>
        ))}
        {personalities.length === 0 && (
          <p className="text-center text-gray-500 py-8">パーソナリティが登録されていません</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: PersonalityDetail.tsx を作成**

```typescript
// apps/admin-ui/src/pages/PersonalityDetail.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  deleteAudioSample,
  deletePersonality,
  fetchPersonality,
  updatePersonality,
  uploadAudioSample
} from '../api'

export default function PersonalityDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const { data: personality, isLoading } = useQuery({
    queryKey: ['personality', id],
    queryFn: () => fetchPersonality(id!),
    enabled: !!id,
    onSuccess: (data) => {
      setEditName(data.name)
      setEditDesc(data.description ?? '')
    }
  })

  const updateMutation = useMutation({
    mutationFn: () => updatePersonality(id!, { name: editName, description: editDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personality', id] })
      setIsEditing(false)
    }
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAudioSample(id!, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personality', id] })
  })

  const deleteSampleMutation = useMutation({
    mutationFn: (sampleId: number) => deleteAudioSample(id!, sampleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['personality', id] })
  })

  if (isLoading) return <div className="text-center py-8">読み込み中...</div>
  if (!personality) return <div className="text-center py-8 text-red-500">見つかりませんでした</div>

  return (
    <div>
      <Link to="/personalities" className="text-blue-600 hover:underline mb-4 inline-block">
        ← パーソナリティ一覧に戻る
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {isEditing ? (
          <div>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-2 text-xl font-bold"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="特徴・説明（任意）"
              className="w-full border rounded px-3 py-2 mb-3 h-20 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                保存
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded"
              >
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{personality.name}</h2>
              {personality.description && (
                <p className="text-gray-600 mt-1">{personality.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm text-indigo-600 hover:underline"
            >
              編集
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">声サンプル</h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'アップロード中...' : '+ サンプルを追加'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadMutation.mutate(file)
              e.target.value = ''
            }}
          />
        </div>

        {personality.audioSamples.length === 0 ? (
          <p className="text-sm text-gray-500">
            サンプルなし（登録すると文字起こし時の話者識別精度が向上します）
          </p>
        ) : (
          <ul className="space-y-2">
            {personality.audioSamples.map((sample) => (
              <li key={sample.id} className="flex items-center gap-3 p-3 border rounded">
                <audio controls src={sample.storageUrl} className="flex-1 h-8" />
                <button
                  type="button"
                  onClick={() => deleteSampleMutation.mutate(sample.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: App.tsx にルートを追加**

`/episodes/:id` などが定義されている箇所の近くに追加：

```typescript
import PersonalityList from './pages/PersonalityList'
import PersonalityDetail from './pages/PersonalityDetail'

// Routes に追加
<Route path="/personalities" element={<PersonalityList />} />
<Route path="/personalities/:id" element={<PersonalityDetail />} />
```

ナビゲーションメニューにも `/personalities` リンクを追加。

- [ ] **Step 6: コミット**

```bash
git add apps/admin-ui/src/
git commit -m "feat: Personality 管理 Admin UI を追加（一覧・詳細・音声サンプルアップロード）"
```

---

## Task 6: PodcastDetail + EpisodeDetail にパーソナリティセクション追加 (apps/)

**Files:**
- Modify: `apps/admin-ui/src/pages/PodcastDetail.tsx`
- Modify: `apps/admin-ui/src/pages/EpisodeDetail.tsx`

- [ ] **Step 1: PodcastDetail.tsx にキャストセクションを追加**

`PodcastDetail.tsx` の `podcast.rssUrl` ブロックの後、エピソード一覧の前に追加：

```typescript
// インポートに追加
import {
  addPersonalityToPodcast,
  fetchPersonalities,
  fetchPersonalitiesByPodcast,
  removePersonalityFromPodcast
} from '../api'

// コンポーネント内に useQuery / useMutation を追加
const { data: allPersonalities = [] } = useQuery({
  queryKey: ['personalities'],
  queryFn: fetchPersonalities
})

const { data: podcastPersonalities = [], refetch: refetchPodcastPersonalities } = useQuery({
  queryKey: ['podcast-personalities', podcastId],
  queryFn: () => fetchPersonalitiesByPodcast(podcastId),
  enabled: !Number.isNaN(podcastId)
})

const addMutation = useMutation({
  mutationFn: ({ personalityId, role }: { personalityId: number; role?: string }) =>
    addPersonalityToPodcast(podcastId, personalityId, role),
  onSuccess: () => refetchPodcastPersonalities()
})

const removeMutation = useMutation({
  mutationFn: (personalityId: number) => removePersonalityFromPodcast(podcastId, personalityId),
  onSuccess: () => refetchPodcastPersonalities()
})

// JSX に追加（エピソード一覧の前）
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <h3 className="text-lg font-semibold mb-3">デフォルト出演者</h3>
  <div className="flex flex-wrap gap-2 mb-3">
    {podcastPersonalities.map((p) => (
      <span key={p.id} className="flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
        {p.name}
        <button
          type="button"
          onClick={() => removeMutation.mutate(p.id)}
          className="ml-1 text-indigo-500 hover:text-indigo-700"
        >
          ×
        </button>
      </span>
    ))}
  </div>
  <select
    onChange={(e) => {
      if (e.target.value) {
        addMutation.mutate({ personalityId: Number(e.target.value) })
        e.target.value = ''
      }
    }}
    className="border rounded px-3 py-1.5 text-sm"
    defaultValue=""
  >
    <option value="" disabled>+ パーソナリティを追加</option>
    {allPersonalities
      .filter((p) => !podcastPersonalities.some((pp) => pp.id === p.id))
      .map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
  </select>
</div>
```

- [ ] **Step 2: EpisodeDetail.tsx にエピソード個別出演者セクションを追加**

EpisodeDetail.tsx（既存ファイルを確認してから追加）に以下のセクションを追加：

```typescript
// インポートに追加
import {
  addPersonalityToEpisode,
  fetchPersonalities,
  fetchPersonalitiesByEpisode,
  removePersonalityFromEpisode
} from '../api'

// エピソード詳細情報の下に追加する JSX
<div className="bg-white rounded-lg shadow p-6 mb-6">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-lg font-semibold">出演者</h3>
    <span className="text-xs text-gray-500">
      {episodePersonalities.length === 0 ? '（番組デフォルトを使用）' : 'エピソード個別設定'}
    </span>
  </div>
  <div className="flex flex-wrap gap-2 mb-3">
    {episodePersonalities.map((p) => (
      <span key={p.id} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
        {p.name}
        <button
          type="button"
          onClick={() => removeEpisodePersonalityMutation.mutate(p.id)}
          className="ml-1 text-green-500 hover:text-green-700"
        >
          ×
        </button>
      </span>
    ))}
  </div>
  <select
    onChange={(e) => {
      if (e.target.value) {
        addEpisodePersonalityMutation.mutate(Number(e.target.value))
        e.target.value = ''
      }
    }}
    className="border rounded px-3 py-1.5 text-sm"
    defaultValue=""
  >
    <option value="" disabled>+ この回の出演者を追加</option>
    {allPersonalities
      .filter((p) => !episodePersonalities.some((ep) => ep.id === p.id))
      .map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
  </select>
</div>
```

- [ ] **Step 3: コミット**

```bash
git add apps/admin-ui/src/pages/PodcastDetail.tsx apps/admin-ui/src/pages/EpisodeDetail.tsx
git commit -m "feat: PodcastDetail と EpisodeDetail にパーソナリティ管理セクションを追加"
```

---

## 検証手順

1. `docker compose up` または `pnpm dev` でローカル環境を起動
2. `supabase start` で Supabase ローカルを起動
3. Admin UI の `/personalities` にアクセス
4. パーソナリティを新規作成し、声サンプルをアップロード
5. Podcast 詳細ページでデフォルト出演者を設定
6. Episode 詳細ページでエピソード個別出演者を上書き設定
7. `pnpm test` で全テストが通ることを確認
