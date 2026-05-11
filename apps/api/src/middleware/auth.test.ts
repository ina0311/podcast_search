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
