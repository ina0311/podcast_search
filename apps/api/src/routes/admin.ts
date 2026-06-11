import { Hono } from 'hono'
import { z } from 'zod'
import { runImport } from '../domains/import/import-podcast.usecase'
import { jobStore } from '../domains/import/job-store'

const ingestBodySchema = z.object({
  rssUrl: z.string().url().optional(),
  podcastId: z.coerce.number().int().positive().optional()
})

const adminRouter = new Hono()
  .post('/ingest', async (c) => {
    if (jobStore.getState().status === 'running') {
      return c.json({ error: 'Ingestion already in progress' }, 409)
    }
    const raw = await c.req.json().catch(() => ({}))
    const parsed = ingestBodySchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ error: 'Invalid request body' }, 400)
    }
    // jobId はクライアントへの受付確認用。状態は GET /ingest/status でポーリングする（シングルジョブ管理）
    const jobId = crypto.randomUUID()
    // runImport 内で jobStore.complete() が呼ばれる。例外時のみ fail() にフォールバック
    void runImport(parsed.data).catch(() => jobStore.fail())
    return c.json({ jobId }, 202)
  })
  .get('/ingest/status', (c) => {
    return c.json(jobStore.getState())
  })

export default adminRouter
