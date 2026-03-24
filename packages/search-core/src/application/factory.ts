/**
 * SearchCore ファクトリー（アプリケーション層）
 *
 * 環境変数に基づいて適切な実装を選択し、SearchCore インスタンスを生成します。
 */

import type { EmbeddingProvider, VectorStore } from '../domain'
import type { SearchCoreOptions } from '../index'
import { SearchCore } from '../index'
import { OpenAIEmbeddingProvider } from '../infrastructure/embedding'
import { QdrantStore } from '../infrastructure/vector-store'

export interface SearchCoreFactoryOptions {
  /** OpenAI API キー */
  openaiApiKey?: string
  /** OpenAI Embedding モデル */
  openaiModel?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002'
  /** Qdrant URL */
  qdrantUrl?: string
  /** Qdrant API キー */
  qdrantApiKey?: string
  /** Qdrant コレクション名 */
  qdrantCollectionName?: string
}

/**
 * 環境変数から SearchCore を生成
 *
 * 環境変数:
 * - OPENAI_API_KEY: OpenAI API キー
 * - OPENAI_EMBEDDING_MODEL: Embedding モデル（デフォルト: 'text-embedding-3-small'）
 * - QDRANT_URL: Qdrant の URL
 * - QDRANT_API_KEY: Qdrant API キー（オプション）
 * - QDRANT_COLLECTION_NAME: コレクション名（デフォルト: 'transcript_segments'）
 */
export function createSearchCoreFromEnv(): SearchCore {
  return createSearchCore({
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: (process.env.OPENAI_EMBEDDING_MODEL ??
      'text-embedding-3-small') as 'text-embedding-3-small',
    qdrantUrl: process.env.QDRANT_URL,
    qdrantApiKey: process.env.QDRANT_API_KEY,
    qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME
  })
}

/**
 * オプションから SearchCore を生成
 */
export function createSearchCore(options: SearchCoreFactoryOptions): SearchCore {
  const embeddingProvider = createEmbeddingProvider(options)
  const vectorStore = createVectorStore(options)

  return new SearchCore({
    embeddingProvider,
    vectorStore
  })
}

/**
 * Embedding Provider を生成
 */
function createEmbeddingProvider(options: SearchCoreFactoryOptions): EmbeddingProvider {
  if (!options.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required')
  }
  return new OpenAIEmbeddingProvider({
    apiKey: options.openaiApiKey,
    model: options.openaiModel
  })
}

/**
 * Vector Store を生成
 */
function createVectorStore(options: SearchCoreFactoryOptions): VectorStore {
  if (!options.qdrantUrl) {
    throw new Error('QDRANT_URL is required')
  }
  return new QdrantStore({
    url: options.qdrantUrl,
    apiKey: options.qdrantApiKey,
    collectionName: options.qdrantCollectionName
  })
}
