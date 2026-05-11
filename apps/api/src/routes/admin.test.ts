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
