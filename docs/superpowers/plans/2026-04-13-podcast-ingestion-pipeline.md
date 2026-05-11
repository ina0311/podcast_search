# Podcast Ingestion Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /admin/ingest` を起点に RSS → MP3 → Whisper → Embedding → Qdrant の取り込みパイプラインを実装する。

**Architecture:** HTTP ルートは 202 を即返却しバックグラウンドで `ImportPodcastUseCase` を起動。Usecase は `services/rss` でフィード取得・`services/transcription` で音声処理を行い、`packages/database` と `packages/search-core` で永続化する。ジョブ状態はインメモリの `job-store` で管理する。

**Tech Stack:** Hono, fast-xml-parser, Node.js child_process (Whisper CLI), @podcast_search/database, @podcast_search/search-core, Jest

---

## ファイルマップ

| 操作 | パス |
|---|---|
| 追加 | `apps/api/src/services/rss/rss-fetcher.ts` |
| 追加 | `apps/api/src/services/rss/rss-fetcher.test.ts` |
| 追加 | `apps/api/src/services/transcription/audio-downloader.ts` |
| 追加 | `apps/api/src/services/transcription/audio-downloader.test.ts` |
| 追加 | `apps/api/src/services/transcription/whisper-runner.ts` |
| 追加 | `apps/api/src/services/transcription/whisper-runner.test.ts` |
| 追加 | `apps/api/src/domains/import/job-store.ts` |
| 追加 | `apps/api/src/domains/import/job-store.test.ts` |
| 追加 | `apps/api/src/domains/import/import-podcast.usecase.ts` |
| 追加 | `apps/api/src/domains/import/import-podcast.usecase.test.ts` |
| 追加 | `apps/api/src/middleware/auth.ts` |
| 追加 | `apps/api/src/middleware/auth.test.ts` |
| 追加 | `apps/api/src/routes/admin.ts` |
| 追加 | `apps/api/src/routes/admin.test.ts` |
| 変更 | `packages/config/src/env/common.ts` |
| 変更 | `packages/database/src/repositories/transcript.ts` |
| 変更 | `apps/api/src/index.ts` |

---

### Task 1: 依存追加 & config 更新

**Files:**
- Modify: `apps/api/package.json`（pnpm add）
- Modify: `packages/config/src/env/common.ts`

- [x] **Step 1: fast-xml-parser を追加**

```bash
pnpm add fast-xml-parser --filter api
```

Expected: `apps/api/package.json` の dependencies に `fast-xml-parser` が追加される。

- [x] **Step 2: ADMIN_API_KEY を config スキーマに追加**

`packages/config/src/env/common.ts` の `EnvSchema` に追加する:

```typescript
// DATABASE_URL の下に追加
ADMIN_API_KEY: z.string().min(1).optional(),
```

- [x] **Step 3: 型チェック**

```bash
pnpm typecheck
```

Expected: エラーなし。

- [x] **Step 4: コミット**

```bash
git add packages/config/src/env/common.ts apps/api/package.json pnpm-lock.yaml
git commit -m "add: fast-xml-parser 依存と ADMIN_API_KEY 環境変数を追加"
```

---

### Task 2: RSS Fetcher

**Files:**
- Create: `apps/api/src/services/rss/rss-fetcher.ts`
- Create: `apps/api/src/services/rss/rss-fetcher.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/services/rss/rss-fetcher.test.ts`:

```typescript
const mockFetch = jest.spyOn(global, 'fetch')

describe('fetchRssEpisodes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('enclosure URLをデコードしてaudioUrlを返す', async () => {
    const encodedUrl =
      'https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-3-7%2Fabc.mp3'
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Episode 1</title>
      <pubDate>Mon, 07 Apr 2026 05:00:00 GMT</pubDate>
      <enclosure url="https://anchor.fm/s/xxx/podcast/play/123/${encodedUrl}" length="0" type="audio/mpeg"/>
      <itunes:duration>3600</itunes:duration>
      <description>説明</description>
    </item>
  </channel>
</rss>`
    mockFetch.mockResolvedValueOnce(new Response(xml, { status: 200 }) as any)

    const { fetchRssEpisodes } = await import('./rss-fetcher')
    const episodes = await fetchRssEpisodes('https://example.com/rss')

    expect(episodes).toHaveLength(1)
    expect(episodes[0].audioUrl).toBe(
      'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-3-7/abc.mp3'
    )
    expect(episodes[0].title).toBe('Episode 1')
    expect(episodes[0].durationSec).toBe(3600)
  })

  it('fetchが失敗するとエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }) as any)

    const { fetchRssEpisodes } = await import('./rss-fetcher')
    await expect(fetchRssEpisodes('https://example.com/rss')).rejects.toThrow('RSS fetch failed')
  })

  it('enclosureがないitemはスキップする', async () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item><title>No Audio</title></item>
  </channel>
</rss>`
    mockFetch.mockResolvedValueOnce(new Response(xml, { status: 200 }) as any)

    const { fetchRssEpisodes } = await import('./rss-fetcher')
    const episodes = await fetchRssEpisodes('https://example.com/rss')

    expect(episodes).toHaveLength(0)
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test rss-fetcher.test.ts
```

Expected: FAIL（モジュールが存在しない）

- [x] **Step 3: 実装を書く**

`apps/api/src/services/rss/rss-fetcher.ts`:

```typescript
import { XMLParser } from 'fast-xml-parser'

export interface RssEpisode {
  title: string
  enclosureUrl: string
  audioUrl: string
  publishedAt: Date | null
  durationSec: number | null
  description: string | null
}

function extractAudioUrl(enclosureUrl: string): string {
  // https://anchor.fm/s/xxx/podcast/play/{id}/{URL_encoded_cloudfront_url}
  const parts = enclosureUrl.split('/')
  const lastSegment = parts[parts.length - 1]
  try {
    const decoded = decodeURIComponent(lastSegment)
    if (decoded.startsWith('http')) return decoded
  } catch {}
  return enclosureUrl
}

function parseDurationSec(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const parts = value.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(value) || null
}

export async function fetchRssEpisodes(rssUrl: string): Promise<RssEpisode[]> {
  const res = await fetch(rssUrl)
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  const xml = await res.text()

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const items: unknown[] = parsed?.rss?.channel?.item ?? []
  const itemArray = Array.isArray(items) ? items : [items]

  return itemArray
    .filter((item: any) => item?.enclosure?.['@_url'])
    .map((item: any) => {
      const enclosureUrl = String(item.enclosure['@_url'])
      return {
        title: String(item.title ?? ''),
        enclosureUrl,
        audioUrl: extractAudioUrl(enclosureUrl),
        publishedAt: item.pubDate ? new Date(item.pubDate as string) : null,
        durationSec: parseDurationSec(item['itunes:duration']),
        description: item.description ? String(item.description) : null
      }
    })
}
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test rss-fetcher.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/services/rss/
git commit -m "feat: RSS フィード取得・enclosure URL デコードサービスを追加"
```

---

### Task 3: Audio Downloader

**Files:**
- Create: `apps/api/src/services/transcription/audio-downloader.ts`
- Create: `apps/api/src/services/transcription/audio-downloader.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/services/transcription/audio-downloader.test.ts`:

```typescript
const mockFetch = jest.spyOn(global, 'fetch')

jest.mock('node:fs', () => ({
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn((event: string, cb: () => void) => {
      if (event === 'finish') cb()
    })
  }))
}))

jest.mock('node:stream/promises', () => ({
  pipeline: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined)
}))

describe('downloadAudio', () => {
  beforeEach(() => jest.clearAllMocks())

  it('200レスポンスでファイルパスを返す', async () => {
    const mockBody = {}
    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockBody
    } as any)

    const { downloadAudio } = await import('./audio-downloader')
    const result = await downloadAudio('https://example.com/ep.mp3', 'ep-1.mp3')

    expect(result).toContain('ep-1.mp3')
  })

  it('非200レスポンスでエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 } as any)

    const { downloadAudio } = await import('./audio-downloader')
    await expect(downloadAudio('https://example.com/ep.mp3', 'ep-1.mp3')).rejects.toThrow(
      'Audio download failed: 403'
    )
  })
})

describe('deleteAudio', () => {
  it('ファイルが存在しなくてもエラーをスローしない', async () => {
    const { unlink } = await import('node:fs/promises')
    jest.mocked(unlink).mockRejectedValueOnce(new Error('ENOENT'))

    const { deleteAudio } = await import('./audio-downloader')
    await expect(deleteAudio('/tmp/nonexistent.mp3')).resolves.not.toThrow()
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test audio-downloader.test.ts
```

Expected: FAIL

- [x] **Step 3: 実装を書く**

`apps/api/src/services/transcription/audio-downloader.ts`:

```typescript
import { createWriteStream } from 'node:fs'
import { mkdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipeline } from 'node:stream/promises'

export async function downloadAudio(audioUrl: string, fileName: string): Promise<string> {
  const dir = join(tmpdir(), 'podcast-ingestion')
  await mkdir(dir, { recursive: true })
  const filePath = join(dir, fileName)

  const res = await fetch(audioUrl)
  if (!res.ok) throw new Error(`Audio download failed: ${res.status}`)
  if (!res.body) throw new Error('Response body is empty')

  const writer = createWriteStream(filePath)
  await pipeline(res.body as any, writer)

  return filePath
}

export async function deleteAudio(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
  } catch {
    // ファイルが既に削除されていても無視する
  }
}
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test audio-downloader.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/services/transcription/audio-downloader.ts apps/api/src/services/transcription/audio-downloader.test.ts
git commit -m "feat: MP3 ダウンロードサービスを追加"
```

---

### Task 4: Whisper Runner

**Files:**
- Create: `apps/api/src/services/transcription/whisper-runner.ts`
- Create: `apps/api/src/services/transcription/whisper-runner.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/services/transcription/whisper-runner.test.ts`:

```typescript
import { EventEmitter } from 'node:events'

jest.mock('node:child_process', () => ({
  spawn: jest.fn()
}))

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  rm: jest.fn().mockResolvedValue(undefined)
}))

import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'

const mockSpawn = jest.mocked(spawn)
const mockReadFile = jest.mocked(readFile)

function createMockProcess(exitCode: number) {
  const proc = new EventEmitter() as any
  proc.kill = jest.fn()
  setTimeout(() => proc.emit('close', exitCode), 0)
  return proc
}

describe('transcribeAudio', () => {
  beforeEach(() => jest.clearAllMocks())

  it('whisper が正常終了したときセグメントを返す', async () => {
    mockSpawn.mockReturnValueOnce(createMockProcess(0) as any)
    const whisperOutput = JSON.stringify({
      segments: [
        { text: ' こんにちは', start: 0.0, end: 2.5 },
        { text: ' 世界', start: 2.5, end: 5.0 }
      ]
    })
    mockReadFile.mockResolvedValueOnce(whisperOutput as any)

    const { transcribeAudio } = await import('./whisper-runner')
    const segments = await transcribeAudio('/tmp/ep-1.mp3')

    expect(segments).toEqual([
      { text: 'こんにちは', startMs: 0, endMs: 2500 },
      { text: '世界', startMs: 2500, endMs: 5000 }
    ])
  })

  it('whisper が非ゼロで終了したときエラーをスロー', async () => {
    mockSpawn.mockReturnValueOnce(createMockProcess(1) as any)

    const { transcribeAudio } = await import('./whisper-runner')
    await expect(transcribeAudio('/tmp/ep-1.mp3')).rejects.toThrow('Whisper exited with code 1')
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test whisper-runner.test.ts
```

Expected: FAIL

- [x] **Step 3: 実装を書く**

`apps/api/src/services/transcription/whisper-runner.ts`:

```typescript
import { spawn } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'

export interface WhisperSegment {
  text: string
  startMs: number
  endMs: number
}

export async function transcribeAudio(
  audioPath: string,
  timeoutMs = 10 * 60 * 1000
): Promise<WhisperSegment[]> {
  const outputDir = join(tmpdir(), 'podcast-ingestion')

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('whisper', [audioPath, '--output_format', 'json', '--output_dir', outputDir])

    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('Whisper timed out'))
    }, timeoutMs)

    proc.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve()
      else reject(new Error(`Whisper exited with code ${code}`))
    })

    proc.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

  const audioBasename = basename(audioPath, extname(audioPath))
  const jsonPath = join(outputDir, `${audioBasename}.json`)
  const raw = JSON.parse(await readFile(jsonPath, 'utf-8'))

  try {
    await rm(jsonPath)
  } catch {}

  const segments: any[] = raw.segments ?? []
  return segments.map((seg) => ({
    text: String(seg.text).trim(),
    startMs: Math.round(seg.start * 1000),
    endMs: Math.round(seg.end * 1000)
  }))
}
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test whisper-runner.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/services/transcription/whisper-runner.ts apps/api/src/services/transcription/whisper-runner.test.ts
git commit -m "feat: Whisper CLI 実行・出力パースサービスを追加"
```

---

### Task 5: TranscriptRepository に bulkCreate を追加

**Files:**
- Modify: `packages/database/src/repositories/transcript.ts`
- Create: `packages/database/src/repositories/transcript.test.ts`

- [x] **Step 1: テストを書く**

`packages/database/src/repositories/transcript.test.ts`:

```typescript
import { createMockPrismaClient } from '../tests/helpers/mock-prisma'
import { TranscriptRepository } from './transcript'

const mockDb = createMockPrismaClient()
const repo = new TranscriptRepository(mockDb as any)

describe('TranscriptRepository', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('bulkCreate', () => {
    it('セグメントを createMany でまとめて保存する', async () => {
      mockDb.transcriptSegment.createMany = jest.fn().mockResolvedValue({ count: 2 })

      await repo.bulkCreate([
        { episodeId: 1, text: 'こんにちは', startMs: 0, endMs: 2500 },
        { episodeId: 1, text: '世界', startMs: 2500, endMs: 5000 }
      ])

      expect(mockDb.transcriptSegment.createMany).toHaveBeenCalledWith({
        data: [
          { episodeId: 1, text: 'こんにちは', startMs: 0, endMs: 2500 },
          { episodeId: 1, text: '世界', startMs: 2500, endMs: 5000 }
        ],
        skipDuplicates: true
      })
    })

    it('空配列のときは createMany を呼ばない', async () => {
      mockDb.transcriptSegment.createMany = jest.fn()

      await repo.bulkCreate([])

      expect(mockDb.transcriptSegment.createMany).not.toHaveBeenCalled()
    })
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test transcript.test.ts
```

Expected: FAIL（`bulkCreate` が存在しない）

- [x] **Step 3: bulkCreate を追加**

`packages/database/src/repositories/transcript.ts` の末尾（`}` の前）に追加:

```typescript
  async bulkCreate(
    segments: Array<{
      episodeId: number
      text: string
      startMs: number
      endMs: number
      language?: string | null
    }>
  ): Promise<void> {
    if (segments.length === 0) return
    await this.db.transcriptSegment.createMany({
      data: segments,
      skipDuplicates: true
    })
  }
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test transcript.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add packages/database/src/repositories/transcript.ts packages/database/src/repositories/transcript.test.ts
git commit -m "feat: TranscriptRepository に bulkCreate を追加"
```

---

### Task 6: Job Store

**Files:**
- Create: `apps/api/src/domains/import/job-store.ts`
- Create: `apps/api/src/domains/import/job-store.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/domains/import/job-store.test.ts`:

```typescript
describe('jobStore', () => {
  beforeEach(async () => {
    jest.resetModules()
  })

  it('初期状態は idle', async () => {
    const { jobStore } = await import('./job-store')
    expect(jobStore.getState().status).toBe('idle')
  })

  it('start で running になり total がセットされる', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(10)
    const state = jobStore.getState()
    expect(state.status).toBe('running')
    expect(state.total).toBe(10)
    expect(state.done).toBe(0)
    expect(state.errors).toHaveLength(0)
  })

  it('incrementDone で done が増加する', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(3)
    jobStore.incrementDone()
    jobStore.incrementDone()
    expect(jobStore.getState().done).toBe(2)
  })

  it('addError でエラーが記録される', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(1)
    jobStore.addError(5, 'download failed')
    expect(jobStore.getState().errors).toEqual([{ episodeId: 5, message: 'download failed' }])
  })

  it('complete で done になる', async () => {
    const { jobStore } = await import('./job-store')
    jobStore.start(1)
    jobStore.complete()
    expect(jobStore.getState().status).toBe('done')
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test job-store.test.ts
```

Expected: FAIL

- [x] **Step 3: 実装を書く**

`apps/api/src/domains/import/job-store.ts`:

```typescript
export type JobStatus = 'idle' | 'running' | 'done' | 'error'

export interface JobError {
  episodeId: number
  message: string
}

export interface JobState {
  status: JobStatus
  total: number
  done: number
  errors: JobError[]
}

const state: JobState = {
  status: 'idle',
  total: 0,
  done: 0,
  errors: []
}

export const jobStore = {
  getState(): JobState {
    return { ...state, errors: [...state.errors] }
  },
  start(total: number): void {
    state.status = 'running'
    state.total = total
    state.done = 0
    state.errors = []
  },
  complete(): void {
    state.status = 'done'
  },
  fail(): void {
    state.status = 'error'
  },
  incrementDone(): void {
    state.done++
  },
  addError(episodeId: number, message: string): void {
    state.errors.push({ episodeId, message })
  }
}
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test job-store.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/domains/import/job-store.ts apps/api/src/domains/import/job-store.test.ts
git commit -m "feat: インメモリジョブ状態管理を追加"
```

---

### Task 7: Import Use Case

**Files:**
- Create: `apps/api/src/domains/import/import-podcast.usecase.ts`
- Create: `apps/api/src/domains/import/import-podcast.usecase.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/domains/import/import-podcast.usecase.test.ts`:

```typescript
jest.mock('@podcast_search/database', () => ({
  PodcastRepository: jest.fn().mockImplementation(() => ({
    findMany: jest.fn()
  })),
  EpisodeRepository: jest.fn().mockImplementation(() => ({
    upsertByEnclosureUrl: jest.fn()
  })),
  TranscriptRepository: jest.fn().mockImplementation(() => ({
    countByEpisodeId: jest.fn(),
    bulkCreate: jest.fn(),
    findByEpisodeId: jest.fn()
  }))
}))

jest.mock('@podcast_search/search-core', () => ({
  createSearchCoreFromEnv: jest.fn().mockReturnValue({
    embedBatch: jest.fn(),
    upsertBatch: jest.fn()
  })
}))

jest.mock('../../services/rss/rss-fetcher', () => ({
  fetchRssEpisodes: jest.fn()
}))

jest.mock('../../services/transcription/audio-downloader', () => ({
  downloadAudio: jest.fn(),
  deleteAudio: jest.fn()
}))

jest.mock('../../services/transcription/whisper-runner', () => ({
  transcribeAudio: jest.fn()
}))

jest.mock('./job-store', () => ({
  jobStore: {
    getState: jest.fn(() => ({ status: 'idle', total: 0, done: 0, errors: [] })),
    start: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    incrementDone: jest.fn(),
    addError: jest.fn()
  }
}))

import { PodcastRepository, EpisodeRepository, TranscriptRepository } from '@podcast_search/database'
import { createSearchCoreFromEnv } from '@podcast_search/search-core'
import { fetchRssEpisodes } from '../../services/rss/rss-fetcher'
import { downloadAudio, deleteAudio } from '../../services/transcription/audio-downloader'
import { transcribeAudio } from '../../services/transcription/whisper-runner'
import { jobStore } from './job-store'

const mockPodcastRepo = jest.mocked(PodcastRepository).mock.results[0]?.value
const mockEpisodeRepo = jest.mocked(EpisodeRepository).mock.results[0]?.value
const mockTranscriptRepo = jest.mocked(TranscriptRepository).mock.results[0]?.value
const mockSearchCore = jest.mocked(createSearchCoreFromEnv).mock.results[0]?.value

describe('runImport', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rssUrl がないポッドキャストはスキップする', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(() => ({
      findMany: jest.fn().mockResolvedValue([
        { id: 1, rssUrl: null, title: 'No RSS' }
      ])
    } as any))

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(fetchRssEpisodes).not.toHaveBeenCalled()
    expect(jobStore.complete).toHaveBeenCalled()
  })

  it('既に文字起こし済みのエピソードはスキップする', async () => {
    jest.mocked(PodcastRepository).mockImplementationOnce(() => ({
      findMany: jest.fn().mockResolvedValue([{ id: 1, rssUrl: 'https://example.com/rss' }])
    } as any))
    jest.mocked(fetchRssEpisodes).mockResolvedValueOnce([
      { title: 'Ep1', enclosureUrl: 'https://anchor.fm/play/1/https%3A%2F%2Fex.mp3', audioUrl: 'https://ex.mp3', publishedAt: null, durationSec: null, description: null }
    ])
    jest.mocked(EpisodeRepository).mockImplementationOnce(() => ({
      upsertByEnclosureUrl: jest.fn().mockResolvedValue({ id: 10 })
    } as any))
    jest.mocked(TranscriptRepository).mockImplementationOnce(() => ({
      countByEpisodeId: jest.fn().mockResolvedValue(5),
      bulkCreate: jest.fn(),
      findByEpisodeId: jest.fn()
    } as any))

    const { runImport } = await import('./import-podcast.usecase')
    await runImport()

    expect(downloadAudio).not.toHaveBeenCalled()
    expect(jobStore.incrementDone).toHaveBeenCalled()
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test import-podcast.usecase.test.ts
```

Expected: FAIL

- [x] **Step 3: 実装を書く**

`apps/api/src/domains/import/import-podcast.usecase.ts`:

```typescript
import {
  EpisodeRepository,
  PodcastRepository,
  TranscriptRepository
} from '@podcast_search/database'
import { createSearchCoreFromEnv } from '@podcast_search/search-core'
import logger from '../../lib/logger'
import { downloadAudio, deleteAudio } from '../../services/transcription/audio-downloader'
import { transcribeAudio } from '../../services/transcription/whisper-runner'
import { fetchRssEpisodes, type RssEpisode } from '../../services/rss/rss-fetcher'
import { jobStore } from './job-store'

const podcastRepo = new PodcastRepository()
const episodeRepo = new EpisodeRepository()
const transcriptRepo = new TranscriptRepository()
const searchCore = createSearchCoreFromEnv()

export async function runImport(): Promise<void> {
  // Phase 1: RSS フィードから全エピソードを収集
  const podcasts = await podcastRepo.findMany()
  const podcastsWithRss = podcasts.filter(
    (p): p is typeof p & { rssUrl: string } => p.rssUrl != null
  )

  const allItems: { podcastId: number; ep: RssEpisode }[] = []
  for (const podcast of podcastsWithRss) {
    try {
      const episodes = await fetchRssEpisodes(podcast.rssUrl)
      for (const ep of episodes) {
        allItems.push({ podcastId: podcast.id, ep })
      }
    } catch (err) {
      logger.error({ err, podcastId: podcast.id }, 'RSS fetch failed')
    }
  }

  jobStore.start(allItems.length)

  // Phase 2: 各エピソードを処理
  for (const { podcastId, ep } of allItems) {
    let dbEpisodeId: number
    try {
      const dbEpisode = await episodeRepo.upsertByEnclosureUrl({
        podcastId,
        title: ep.title,
        enclosureUrl: ep.audioUrl,
        publishedAt: ep.publishedAt,
        durationSec: ep.durationSec,
        description: ep.description
      })
      dbEpisodeId = dbEpisode.id
    } catch (err) {
      logger.error({ err, title: ep.title }, 'Episode upsert failed')
      jobStore.addError(-1, err instanceof Error ? err.message : String(err))
      continue
    }

    // 既に文字起こし済みならスキップ
    const transcriptCount = await transcriptRepo.countByEpisodeId(dbEpisodeId)
    if (transcriptCount > 0) {
      jobStore.incrementDone()
      continue
    }

    // 音声ファイルをダウンロード
    const fileName = `ep-${dbEpisodeId}-${Date.now()}.mp3`
    let audioPath: string
    try {
      audioPath = await downloadAudio(ep.audioUrl, fileName)
    } catch (err) {
      logger.error({ err, episodeId: dbEpisodeId }, 'Audio download failed')
      jobStore.addError(dbEpisodeId, err instanceof Error ? err.message : String(err))
      continue
    }

    try {
      // Whisper で文字起こし
      const segments = await transcribeAudio(audioPath)

      // DB に保存
      await transcriptRepo.bulkCreate(
        segments.map((s) => ({ episodeId: dbEpisodeId, ...s }))
      )

      // Embedding → Qdrant
      const savedSegments = await transcriptRepo.findByEpisodeId(dbEpisodeId)
      if (savedSegments.length > 0) {
        const vectors = await searchCore.embedBatch(savedSegments.map((s) => s.text))
        await searchCore.upsertBatch(
          savedSegments.map((s, i) => ({
            id: String(s.id),
            vector: vectors[i],
            payload: { episodeId: dbEpisodeId }
          }))
        )
      }

      jobStore.incrementDone()
    } catch (err) {
      logger.error({ err, episodeId: dbEpisodeId }, 'Episode processing failed')
      jobStore.addError(dbEpisodeId, err instanceof Error ? err.message : String(err))
    } finally {
      await deleteAudio(audioPath)
    }
  }

  jobStore.complete()
}
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test import-podcast.usecase.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/domains/import/
git commit -m "feat: ポッドキャスト取り込みユースケースを追加"
```

---

### Task 8: Auth Middleware

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/middleware/auth.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/middleware/auth.test.ts`:

```typescript
jest.mock('@podcast_search/config', () => ({
  env: { ADMIN_API_KEY: 'test-secret-key' }
}))

import { Hono } from 'hono'

describe('adminAuth middleware', () => {
  let app: Hono

  beforeEach(async () => {
    jest.resetModules()
    jest.mock('@podcast_search/config', () => ({
      env: { ADMIN_API_KEY: 'test-secret-key' }
    }))
    const { adminAuth } = await import('./auth')
    app = new Hono()
    app.use('/admin/*', adminAuth)
    app.get('/admin/test', (c) => c.json({ ok: true }))
  })

  it('正しいキーで 200 を返す', async () => {
    const res = await app.request('/admin/test', {
      headers: { 'X-Admin-Key': 'test-secret-key' }
    })
    expect(res.status).toBe(200)
  })

  it('キーなしで 401 を返す', async () => {
    const res = await app.request('/admin/test')
    expect(res.status).toBe(401)
  })

  it('誤ったキーで 401 を返す', async () => {
    const res = await app.request('/admin/test', {
      headers: { 'X-Admin-Key': 'wrong-key' }
    })
    expect(res.status).toBe(401)
  })

  it('ADMIN_API_KEY 未設定のとき 503 を返す', async () => {
    jest.resetModules()
    jest.mock('@podcast_search/config', () => ({
      env: { ADMIN_API_KEY: undefined }
    }))
    const { adminAuth: unauthMiddleware } = await import('./auth')
    const unauthApp = new Hono()
    unauthApp.use('/admin/*', unauthMiddleware)
    unauthApp.get('/admin/test', (c) => c.json({ ok: true }))

    const res = await unauthApp.request('/admin/test', {
      headers: { 'X-Admin-Key': 'any-key' }
    })
    expect(res.status).toBe(503)
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test auth.test.ts
```

Expected: FAIL

- [x] **Step 3: 実装を書く**

`apps/api/src/middleware/auth.ts`:

```typescript
import { env } from '@podcast_search/config'
import { HTTPException } from 'hono/http-exception'
import type { MiddlewareHandler } from 'hono'

export const adminAuth: MiddlewareHandler = async (c, next) => {
  if (!env.ADMIN_API_KEY) {
    throw new HTTPException(503, { message: 'Admin API key not configured' })
  }
  const key = c.req.header('X-Admin-Key')
  if (key !== env.ADMIN_API_KEY) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
  await next()
}
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test auth.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/middleware/auth.ts apps/api/src/middleware/auth.test.ts
git commit -m "feat: admin API キー認証ミドルウェアを追加"
```

---

### Task 9: Admin Route

**Files:**
- Create: `apps/api/src/routes/admin.ts`
- Create: `apps/api/src/routes/admin.test.ts`

- [x] **Step 1: テストを書く**

`apps/api/src/routes/admin.test.ts`:

```typescript
jest.mock('../domains/import/import-podcast.usecase', () => ({
  runImport: jest.fn().mockResolvedValue(undefined)
}))

jest.mock('../domains/import/job-store', () => ({
  jobStore: {
    getState: jest.fn(() => ({
      status: 'idle',
      total: 0,
      done: 0,
      errors: []
    })),
    start: jest.fn()
  }
}))

import { Hono } from 'hono'
import { runImport } from '../domains/import/import-podcast.usecase'
import { jobStore } from '../domains/import/job-store'

describe('admin routes', () => {
  let app: Hono

  beforeEach(async () => {
    jest.clearAllMocks()
    const { default: adminRouter } = await import('./admin')
    app = new Hono().route('/admin', adminRouter)
  })

  describe('POST /admin/ingest', () => {
    it('202 を返しバックグラウンドで runImport を起動する', async () => {
      jest.mocked(jobStore.getState).mockReturnValueOnce({
        status: 'idle',
        total: 0,
        done: 0,
        errors: []
      })

      const res = await app.request('/admin/ingest', { method: 'POST' })

      expect(res.status).toBe(202)
      const body = await res.json()
      expect(body).toHaveProperty('jobId')
    })

    it('実行中のときは 409 を返す', async () => {
      jest.mocked(jobStore.getState).mockReturnValueOnce({
        status: 'running',
        total: 10,
        done: 3,
        errors: []
      })

      const res = await app.request('/admin/ingest', { method: 'POST' })

      expect(res.status).toBe(409)
      expect(runImport).not.toHaveBeenCalled()
    })
  })

  describe('GET /admin/ingest/status', () => {
    it('ジョブ状態を返す', async () => {
      jest.mocked(jobStore.getState).mockReturnValueOnce({
        status: 'running',
        total: 25,
        done: 12,
        errors: [{ episodeId: 5, message: 'failed' }]
      })

      const res = await app.request('/admin/ingest/status')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.status).toBe('running')
      expect(body.total).toBe(25)
      expect(body.done).toBe(12)
    })
  })
})
```

- [x] **Step 2: テストを失敗させて確認**

```bash
pnpm test admin.test.ts
```

Expected: FAIL

- [x] **Step 3: 実装を書く**

`apps/api/src/routes/admin.ts`:

```typescript
import { Hono } from 'hono'
import { runImport } from '../domains/import/import-podcast.usecase'
import { jobStore } from '../domains/import/job-store'

const adminRouter = new Hono()
  .post('/ingest', (c) => {
    if (jobStore.getState().status === 'running') {
      return c.json({ error: 'Ingestion already in progress' }, 409)
    }
    const jobId = crypto.randomUUID()
    void runImport().catch(() => jobStore.fail())
    return c.json({ jobId }, 202)
  })
  .get('/ingest/status', (c) => {
    return c.json(jobStore.getState())
  })

export default adminRouter
```

- [x] **Step 4: テストをパスさせて確認**

```bash
pnpm test admin.test.ts
```

Expected: PASS

- [x] **Step 5: コミット**

```bash
git add apps/api/src/routes/admin.ts apps/api/src/routes/admin.test.ts
git commit -m "feat: POST /admin/ingest および GET /admin/ingest/status ルートを追加"
```

---

### Task 10: index.ts を更新

**Files:**
- Modify: `apps/api/src/index.ts`

- [x] **Step 1: admin ルートとミドルウェアを追加**

`apps/api/src/index.ts` の import 部分に追加:

```typescript
import adminRouter from './routes/admin'
import { adminAuth } from './middleware/auth'
```

`app` の定義に `.route('/admin', adminRouter)` を追加:

```typescript
const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/podcasts', podcastsRouter)
  .route('/episodes', episodesRouter)
  .route('/search', searchRouter)
  .route('/admin', adminRouter)
```

ミドルウェア設定部分（`app.use('*', cors(...))` の前）に追加:

```typescript
app.use('/admin/*', adminAuth)
```

- [x] **Step 2: 型チェック & テスト**

```bash
pnpm typecheck && pnpm test
```

Expected: 全テスト PASS、型エラーなし

- [x] **Step 3: ローカル動作確認**

環境変数を設定してサーバーを起動:

```bash
ADMIN_API_KEY=dev-secret pnpm dev
```

別ターミナルで確認:

```bash
# 状態確認
curl -H "X-Admin-Key: dev-secret" http://localhost:3000/admin/ingest/status

# 取り込みトリガー（DB に Podcast.rssUrl が入っている状態で）
curl -X POST -H "X-Admin-Key: dev-secret" http://localhost:3000/admin/ingest
```

Expected:
- status: `{"status":"idle","total":0,"done":0,"errors":[]}`
- ingest: `{"jobId":"<uuid>"}` と 202

- [x] **Step 4: コミット**

```bash
git add apps/api/src/index.ts
git commit -m "feat: admin ルートと認証ミドルウェアを index.ts に登録"
```

---

## 検証手順（E2E）

1. ローカル環境を起動: `compose-backend.sh up -d`
2. DB に奇奇怪怪のポッドキャストを登録:
   ```sql
   INSERT INTO "Podcast" (title, "rssUrl") VALUES ('奇奇怪怪', 'https://anchor.fm/s/1c492214/podcast/rss');
   ```
3. Whisper CLI がインストールされていることを確認: `whisper --version`
4. OPENAI_API_KEY, QDRANT_URL, ADMIN_API_KEY を環境変数にセット
5. `pnpm dev` でサーバー起動
6. `curl -X POST -H "X-Admin-Key: <key>" http://localhost:3000/admin/ingest`
7. `curl -H "X-Admin-Key: <key>" http://localhost:3000/admin/ingest/status` でポーリング
8. status が `done` になったら `curl "http://localhost:3000/search?q=孤独"` で検索できることを確認
