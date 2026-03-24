import { QdrantClient, type Schemas } from '@qdrant/js-client-rest'
import type {
  VectorSearchFilter,
  VectorSearchOptions,
  VectorSearchResult,
  VectorStore
} from '../../domain'

export interface QdrantStoreOptions {
  url: string
  apiKey?: string
  collectionName?: string
  /** コレクション作成時のベクトル次元数。省略時は 1536（text-embedding-3-small）を使用 */
  dimensions?: number
}

/**
 * Qdrant Vector Store 実装
 *
 * Qdrantを使用してベクトルの保存・検索・削除を行います。
 */
export class QdrantStore implements VectorStore {
  private readonly client: QdrantClient
  private readonly collectionName: string
  private readonly dimensions: number

  constructor(options: QdrantStoreOptions) {
    this.client = new QdrantClient({
      url: options.url,
      apiKey: options.apiKey
    })
    this.collectionName = options.collectionName ?? 'transcript_segments'
    this.dimensions = options.dimensions ?? 1536
  }

  async upsert(id: string, vector: number[], payload?: Record<string, unknown>): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload
        }
      ]
    })
  }

  async upsertBatch(
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>
  ): Promise<void> {
    await this.client.upsert(this.collectionName, {
      wait: true,
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload
      }))
    })
  }

  async search(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const qdrantFilter = this.convertFilter(options?.filter)

    const result = await this.client.search(this.collectionName, {
      vector,
      limit: options?.limit ?? 10,
      filter: qdrantFilter,
      score_threshold: options?.scoreThreshold
    })

    return result.map((item) => ({
      id: String(item.id),
      score: item.score ?? 0,
      payload: item.payload as VectorSearchResult['payload']
    }))
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: [id]
    })
  }

  async deleteBatch(ids: string[]): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      points: ids
    })
  }

  async collectionExists(): Promise<boolean> {
    try {
      await this.client.getCollection(this.collectionName)
      return true
    } catch (error) {
      // Qdrant は存在しないコレクションへのアクセスで 404 相当のエラーを返す。
      // それ以外（接続エラー等）は上位に再スローして区別できるようにする。
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('Not found') || message.includes('404')) {
        return false
      }
      throw error
    }
  }

  async createCollection(config?: unknown): Promise<void> {
    // 既に存在する場合はスキップ
    if (await this.collectionExists()) {
      return
    }

    const defaultConfig = {
      vectors: {
        size: this.dimensions,
        distance: 'Cosine' as const
      },
      ...(config as Record<string, unknown>)
    }

    await this.client.createCollection(this.collectionName, defaultConfig)
  }

  /**
   * VectorSearchFilter を Qdrant のフィルタ形式に変換
   */
  private convertFilter(filter?: VectorSearchFilter): Schemas['Filter'] | undefined {
    if (!filter) return undefined

    const qdrantFilter: Schemas['Filter'] = {}

    if (filter.must && filter.must.length > 0) {
      qdrantFilter.must = filter.must.map((cond) => this.convertCondition(cond))
    }

    if (filter.should && filter.should.length > 0) {
      qdrantFilter.should = filter.should.map((cond) => this.convertCondition(cond))
    }

    if (filter.mustNot && filter.mustNot.length > 0) {
      qdrantFilter.must_not = filter.mustNot.map((cond) => this.convertCondition(cond))
    }

    return Object.keys(qdrantFilter).length > 0 ? qdrantFilter : undefined
  }

  /**
   * FilterCondition を Qdrant の条件形式に変換
   */
  private convertCondition(condition: {
    key: string
    match?: {
      value?: unknown
      any?: unknown[]
      all?: unknown[]
    }
    range?: {
      gte?: number
      lte?: number
      gt?: number
      lt?: number
    }
  }): Schemas['Condition'] {
    if (condition.match) {
      if (condition.match.value !== undefined) {
        return {
          key: condition.key,
          match: { value: condition.match.value }
        }
      }
      if (condition.match.any) {
        return {
          key: condition.key,
          match: { any: condition.match.any }
        }
      }
      if (condition.match.all) {
        return {
          key: condition.key,
          match: { all: condition.match.all }
        }
      }
    }

    if (condition.range) {
      return {
        key: condition.key,
        range: condition.range
      }
    }

    throw new Error(
      `FilterCondition for key "${condition.key}" has neither valid match nor range. ` +
        'Provide match.value, match.any, match.all, or range.'
    )
  }
}
