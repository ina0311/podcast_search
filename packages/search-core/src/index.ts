import { z } from 'zod'
import type { EmbeddingProvider, VectorSearchResult, VectorStore } from './domain'
import { OpenAIEmbeddingProvider } from './infrastructure/embedding'
import { QdrantStore } from './infrastructure/vector-store'

export type EmbeddingModel = 'text-embedding-3-small'

/**
 * SearchCore の設定オプション
 *
 * 将来的にAWS移行する際は、環境変数で実装を切り替えられるようにします。
 */
export interface SearchCoreOptions {
  // Embedding Provider 設定
  embeddingProvider?: EmbeddingProvider
  openaiApiKey?: string
  embeddingModel?: EmbeddingModel

  // Vector Store 設定
  vectorStore?: VectorStore
  qdrantUrl?: string
  qdrantApiKey?: string
  collectionName?: string

  // AWS設定（将来用）
  awsRegion?: string
  awsAccessKeyId?: string
  awsSecretAccessKey?: string
  awsOpenSearchEndpoint?: string
}

/**
 * SearchCore - ベクトル検索のコアロジック
 *
 * 抽象化レイヤーを使用することで、実装を切り替え可能にしています。
 * - Embedding Provider: OpenAI / AWS Bedrock Titan
 * - Vector Store: Qdrant / AWS OpenSearch / AWS Bedrock Knowledge Bases
 *
 * 使用方法:
 * ```ts
 * // デフォルト（OpenAI + Qdrant）
 * const searchCore = new SearchCore({
 *   openaiApiKey: 'sk-...',
 *   qdrantUrl: 'http://localhost:6333'
 * })
 *
 * // カスタム実装
 * const searchCore = new SearchCore({
 *   embeddingProvider: new OpenAIEmbeddingProvider({ apiKey: '...' }),
 *   vectorStore: new QdrantStore({ url: '...' })
 * })
 * ```
 */
export class SearchCore {
  private readonly embeddingProvider: EmbeddingProvider
  private readonly vectorStore: VectorStore

  constructor(opts: SearchCoreOptions) {
    // Embedding Provider の初期化
    if (opts.embeddingProvider) {
      this.embeddingProvider = opts.embeddingProvider
    } else if (opts.openaiApiKey) {
      this.embeddingProvider = new OpenAIEmbeddingProvider({
        apiKey: opts.openaiApiKey,
        model: opts.embeddingModel
      })
    } else {
      throw new Error('Either embeddingProvider or openaiApiKey must be provided')
    }

    // Vector Store の初期化
    if (opts.vectorStore) {
      this.vectorStore = opts.vectorStore
    } else if (opts.qdrantUrl) {
      this.vectorStore = new QdrantStore({
        url: opts.qdrantUrl,
        apiKey: opts.qdrantApiKey,
        collectionName: opts.collectionName
      })
    } else {
      throw new Error('Either vectorStore or qdrantUrl must be provided')
    }
  }

  /**
   * テキストをベクトルに変換
   */
  async embed(text: string): Promise<number[]> {
    return this.embeddingProvider.embed(text)
  }

  /**
   * 複数のテキストを一括でベクトルに変換
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.embeddingProvider.embedBatch(texts)
  }

  /**
   * クエリ文字列でベクトル検索を実行
   */
  async searchByQuery(query: string, limit = 10): Promise<VectorSearchResult[]> {
    const vector = await this.embed(query)
    return this.vectorStore.search(vector, { limit })
  }

  /**
   * ベクトルで直接検索を実行
   */
  async searchByVector(vector: number[], limit = 10): Promise<VectorSearchResult[]> {
    return this.vectorStore.search(vector, { limit })
  }

  /**
   * ベクトルを保存または更新
   */
  async upsertVector(
    id: string,
    vector: number[],
    payload?: Record<string, unknown>
  ): Promise<void> {
    return this.vectorStore.upsert(id, vector, payload)
  }

  /**
   * 複数のベクトルを一括で保存または更新
   */
  async upsertBatch(
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>
  ): Promise<void> {
    return this.vectorStore.upsertBatch(points)
  }

  /**
   * 使用しているEmbeddingモデル名を取得
   */
  getEmbeddingModel(): string {
    return this.embeddingProvider.getModelName()
  }

  /**
   * ベクトルの次元数を取得
   */
  getDimensions(): number {
    return this.embeddingProvider.getDimensions()
  }

  /**
   * Vector Store のインスタンスを取得（高度な操作用）
   */
  getVectorStore(): VectorStore {
    return this.vectorStore
  }

  /**
   * Embedding Provider のインスタンスを取得（高度な操作用）
   */
  getEmbeddingProvider(): EmbeddingProvider {
    return this.embeddingProvider
  }
}

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().min(1).max(50).default(10)
})

export type { SearchCoreFactoryOptions } from './application/factory'
// ファクトリー関数をエクスポート
export { createSearchCore, createSearchCoreFromEnv } from './application/factory'
