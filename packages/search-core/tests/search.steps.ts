import { defineFeature, loadFeature } from 'jest-cucumber'
import { SearchCore, SearchQuerySchema } from '../src/index'

const feature = loadFeature('./packages/search-core/features/search.feature')

defineFeature(feature, (test) => {
  let searchCore: SearchCore | null = null
  let searchResult: Array<{ id: string; score: number; payload?: { episodeId?: number } }> = []
  let validationResult: { success: boolean; data?: unknown; error?: unknown } | null = null

  // モック用のヘルパー
  const createMockSearchCore = () => {
    const core = new SearchCore({
      openaiApiKey: 'test-api-key',
      qdrantUrl: 'http://localhost:6333'
    })
    return core
  }

  test('有効なクエリで検索する', ({ given, when, then, and }) => {
    given('SearchCore が初期化されている', () => {
      searchCore = createMockSearchCore()
    })

    given(/^Qdrant に "(.+)" に関するセグメントが登録されている$/, (_topic: string) => {
      // SearchCore の searchByQuery をモック
      jest.spyOn(searchCore!, 'searchByQuery').mockResolvedValue([
        { id: 'seg_1', score: 0.95, payload: { episodeId: 123 } },
        { id: 'seg_2', score: 0.87, payload: { episodeId: 124 } }
      ])
    })

    when(/^"(.+)" で検索する$/, async (_query: string) => {
      searchResult = await searchCore!.searchByQuery(_query, 10)
    })

    then('検索結果が返される', () => {
      expect(searchResult).toBeDefined()
      expect(searchResult.length).toBeGreaterThan(0)
    })

    and('結果に episodeId が含まれる', () => {
      expect(searchResult[0].payload).toHaveProperty('episodeId')
    })

    and('結果にスコアが含まれる', () => {
      expect(searchResult[0]).toHaveProperty('score')
      expect(typeof searchResult[0].score).toBe('number')
    })
  })

  test('検索結果の件数を制限する', ({ given, and, when, then }) => {
    given('SearchCore が初期化されている', () => {
      searchCore = createMockSearchCore()
    })

    and('Qdrant に複数のセグメントが登録されている', () => {
      jest.spyOn(searchCore!, 'searchByQuery').mockResolvedValue([
        { id: 'seg_1', score: 0.95, payload: { episodeId: 1 } },
        { id: 'seg_2', score: 0.9, payload: { episodeId: 2 } },
        { id: 'seg_3', score: 0.85, payload: { episodeId: 3 } },
        { id: 'seg_4', score: 0.8, payload: { episodeId: 4 } },
        { id: 'seg_5', score: 0.75, payload: { episodeId: 5 } }
      ])
    })

    when(/^limit を (\d+) に指定して検索する$/, async (limit: string) => {
      searchResult = await searchCore!.searchByQuery('テストクエリ', parseInt(limit, 10))
    })

    then(/^検索結果が (\d+) 件以下で返される$/, (maxCount: string) => {
      expect(searchResult.length).toBeLessThanOrEqual(parseInt(maxCount, 10))
    })
  })

  test('検索クエリのバリデーション - 空文字', ({ when, then }) => {
    when('空文字で検索クエリをバリデーションする', () => {
      validationResult = SearchQuerySchema.safeParse({ q: '', limit: 10 })
    })

    then('バリデーションエラーが発生する', () => {
      expect(validationResult?.success).toBe(false)
    })
  })

  test('検索クエリのバリデーション - 長すぎるクエリ', ({ when, then }) => {
    when('201文字以上のクエリでバリデーションする', () => {
      const longQuery = 'あ'.repeat(201)
      validationResult = SearchQuerySchema.safeParse({ q: longQuery, limit: 10 })
    })

    then('バリデーションエラーが発生する', () => {
      expect(validationResult?.success).toBe(false)
    })
  })

  test('検索クエリのバリデーション - 正常なクエリ', ({ when, then }) => {
    when(/^"(.+)" でバリデーションする$/, (query: string) => {
      validationResult = SearchQuerySchema.safeParse({ q: query, limit: 10 })
    })

    then('バリデーションが成功する', () => {
      expect(validationResult?.success).toBe(true)
    })
  })

  test('limit のバリデーション - 上限超過', ({ when, then }) => {
    when(/^limit を (\d+) に指定してバリデーションする$/, (limit: string) => {
      validationResult = SearchQuerySchema.safeParse({
        q: '有効なクエリ',
        limit: parseInt(limit, 10)
      })
    })

    then('バリデーションエラーが発生する', () => {
      expect(validationResult?.success).toBe(false)
    })
  })

  test('limit のバリデーション - デフォルト値', ({ when, then }) => {
    when('limit を指定せずにバリデーションする', () => {
      validationResult = SearchQuerySchema.safeParse({ q: '有効なクエリ' })
    })

    then(/^limit のデフォルト値は (\d+) になる$/, (defaultLimit: string) => {
      expect(validationResult?.success).toBe(true)
      if (validationResult?.success) {
        expect((validationResult.data as { limit: number }).limit).toBe(parseInt(defaultLimit, 10))
      }
    })
  })
})
