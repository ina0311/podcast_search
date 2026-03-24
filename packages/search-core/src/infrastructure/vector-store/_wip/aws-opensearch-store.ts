/**
 * AWS OpenSearch Vector Store 実装（将来用）
 *
 * AWS移行時に実装します。
 * 現時点ではプレースホルダーとして作成しています。
 */

import type { VectorSearchOptions, VectorSearchResult, VectorStore } from '../../../domain'

export interface AWSOpenSearchStoreOptions {
  endpoint: string
  region?: string
  indexName?: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

/**
 * AWS OpenSearch Vector Store 実装（将来用）
 *
 * 実装例:
 * ```ts
 * import { OpenSearchClient } from '@opensearch-project/opensearch'
 * import { defaultProvider } from '@aws-sdk/credential-providers'
 * import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
 *
 * export class AWSOpenSearchStore implements VectorStore {
 *   private readonly client: OpenSearchClient
 *   private readonly indexName: string
 *
 *   constructor(options: AWSOpenSearchStoreOptions) {
 *     this.client = new OpenSearchClient({
 *       ...AwsSigv4Signer({
 *         region: options.region ?? 'us-east-1',
 *         credentials: defaultProvider()
 *       }),
 *       node: options.endpoint
 *     })
 *     this.indexName = options.indexName ?? 'transcript_segments'
 *   }
 *
 *   async search(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
 *     const response = await this.client.search({
 *       index: this.indexName,
 *       body: {
 *         size: options?.limit ?? 10,
 *         query: {
 *           knn: {
 *             vector_field: {
 *               vector,
 *               k: options?.limit ?? 10
 *             }
 *           }
 *         }
 *       }
 *     })
 *     // ... 結果を変換
 *   }
 *
 *   // ... 他のメソッド
 * }
 * ```
 */
export class AWSOpenSearchStore implements VectorStore {
  constructor(_options: AWSOpenSearchStoreOptions) {
    throw new Error(
      'AWS OpenSearch Store is not yet implemented. ' +
        'This is a placeholder for future AWS migration.'
    )
  }

  async upsert(_id: string, _vector: number[], _payload?: Record<string, unknown>): Promise<void> {
    throw new Error('Not implemented')
  }

  async upsertBatch(
    _points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>
  ): Promise<void> {
    throw new Error('Not implemented')
  }

  async search(_vector: number[], _options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
    throw new Error('Not implemented')
  }

  async delete(_id: string): Promise<void> {
    throw new Error('Not implemented')
  }

  async deleteBatch(_ids: string[]): Promise<void> {
    throw new Error('Not implemented')
  }

  async collectionExists(): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async createCollection(_config?: unknown): Promise<void> {
    throw new Error('Not implemented')
  }
}
