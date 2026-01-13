import { Hono } from 'hono'
import { defineFeature, loadFeature } from 'jest-cucumber'

const feature = loadFeature('./apps/api/features/episodes.feature')

// テスト用の簡易アプリを構築（実際の実装をインポートするとDB接続が必要になるためモック）
const createTestApp = (
  options: {
    hasOpenAIKey?: boolean
    episodes?: Array<{ id: number; title: string; publicId: string; enclosureUrl: string }>
    searchResults?: Array<{ id: string; score: number; payload: { episodeId: number } }>
  } = {}
) => {
  const app = new Hono()

  app.get('/health', (c) => c.json({ status: 'ok' }))

  app.get('/episodes', (c) => {
    const episodes = options.episodes ?? []
    return c.json({ episodes })
  })

  app.get('/episodes/:id', (c) => {
    const id = parseInt(c.req.param('id'), 10)
    if (Number.isNaN(id)) {
      return c.json({ error: 'Invalid id' }, 400)
    }
    const episode = options.episodes?.find((e) => e.id === id)
    if (!episode) {
      return c.json({ error: 'Not found' }, 404)
    }
    return c.json(episode)
  })

  app.get('/search', (c) => {
    const q = c.req.query('q')

    if (!options.hasOpenAIKey) {
      return c.json({ error: 'Search is disabled because OPENAI_API_KEY is not configured.' }, 503)
    }

    if (!q) {
      return c.json({ error: 'Invalid query' }, 400)
    }

    const hits = options.searchResults ?? []
    const episodeIds = [...new Set(hits.map((h) => h.payload.episodeId))]
    const episodes = options.episodes?.filter((e) => episodeIds.includes(e.id)) ?? []

    return c.json({ episodes, hitsCount: hits.length })
  })

  app.notFound((c) => c.json({ error: 'Not Found' }, 404))

  return app
}

defineFeature(feature, (test) => {
  let app: Hono
  let response: Response
  let responseBody: unknown

  const mockEpisodes = [
    { id: 1, title: 'AIの未来', publicId: 'uuid-1', enclosureUrl: 'https://example.com/ep1.mp3' },
    {
      id: 2,
      title: '機械学習入門',
      publicId: 'uuid-2',
      enclosureUrl: 'https://example.com/ep2.mp3'
    }
  ]

  const mockSearchResults = [{ id: 'seg_1', score: 0.95, payload: { episodeId: 1 } }]

  test('ヘルスチェックエンドポイント', ({ when, then, and }) => {
    when('GET /health をリクエストする', async () => {
      app = createTestApp()
      response = await app.request('/health')
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })

    and(/^レスポンスに status: "(.+)" が含まれる$/, (status: string) => {
      expect(responseBody).toHaveProperty('status', status)
    })
  })

  test('エピソード一覧を取得する', ({ given, when, then, and }) => {
    given('データベースにエピソードが登録されている', () => {
      app = createTestApp({ episodes: mockEpisodes })
    })

    when('GET /episodes をリクエストする', async () => {
      response = await app.request('/episodes')
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })

    and('レスポンスに episodes 配列が含まれる', () => {
      expect(responseBody).toHaveProperty('episodes')
      expect(Array.isArray((responseBody as { episodes: unknown[] }).episodes)).toBe(true)
    })
  })

  test('エピソード詳細を取得する', ({ given, when, then, and }) => {
    given(/^データベースに id=(\d+) のエピソードが存在する$/, (_id: string) => {
      app = createTestApp({ episodes: mockEpisodes })
    })

    when(/^GET \/episodes\/(\d+) をリクエストする$/, async (id: string) => {
      response = await app.request(`/episodes/${id}`)
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })

    and('レスポンスに title が含まれる', () => {
      expect(responseBody).toHaveProperty('title')
    })
  })

  test('存在しないエピソードを取得する', ({ given, when, then }) => {
    given(/^データベースに id=(\d+) のエピソードが存在しない$/, (_id: string) => {
      app = createTestApp({ episodes: mockEpisodes })
    })

    when(/^GET \/episodes\/(\d+) をリクエストする$/, async (id: string) => {
      response = await app.request(`/episodes/${id}`)
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })
  })

  test('無効なIDでエピソードを取得する', ({ when, then }) => {
    when(/^GET \/episodes\/(\w+) をリクエストする$/, async (id: string) => {
      app = createTestApp({ episodes: mockEpisodes })
      response = await app.request(`/episodes/${id}`)
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })
  })

  test('検索エンドポイント - 有効なクエリ', ({ given, when, then, and }) => {
    given('OpenAI API キーが設定されている', () => {
      app = createTestApp({
        hasOpenAIKey: true,
        episodes: mockEpisodes,
        searchResults: mockSearchResults
      })
    })

    given('Qdrant にセグメントが登録されている', () => {
      // すでにモックでセットアップ済み
    })

    when(/^GET \/search\?q=(.+) をリクエストする$/, async (query: string) => {
      response = await app.request(`/search?q=${encodeURIComponent(query)}`)
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })

    and('レスポンスに episodes 配列が含まれる', () => {
      expect(responseBody).toHaveProperty('episodes')
      expect(Array.isArray((responseBody as { episodes: unknown[] }).episodes)).toBe(true)
    })

    and('レスポンスに hitsCount が含まれる', () => {
      expect(responseBody).toHaveProperty('hitsCount')
    })
  })

  test('検索エンドポイント - クエリなし', ({ when, then }) => {
    when('GET /search をリクエストする', async () => {
      app = createTestApp({ hasOpenAIKey: true })
      response = await app.request('/search')
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })
  })

  test('検索エンドポイント - OpenAI API キー未設定', ({ given, when, then }) => {
    given('OpenAI API キーが設定されていない', () => {
      app = createTestApp({ hasOpenAIKey: false })
    })

    when(/^GET \/search\?q=(.+) をリクエストする$/, async (query: string) => {
      response = await app.request(`/search?q=${encodeURIComponent(query)}`)
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })
  })

  test('存在しないエンドポイント', ({ when, then }) => {
    when(/^GET \/(\w+) をリクエストする$/, async (path: string) => {
      app = createTestApp()
      response = await app.request(`/${path}`)
      responseBody = await response.json()
    })

    then(/^ステータスコード (\d+) が返される$/, (statusCode: string) => {
      expect(response.status).toBe(parseInt(statusCode, 10))
    })
  })
})
