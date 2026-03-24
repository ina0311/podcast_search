import OpenAI from 'openai'
import type { EmbeddingProvider } from '../../domain'

export interface OpenAIEmbeddingOptions {
  apiKey: string
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002'
}

/**
 * OpenAI Embedding Provider 実装
 *
 * OpenAI APIを使用してテキストをベクトルに変換します。
 *
 * @see https://platform.openai.com/docs/guides/embeddings OpenAI Embeddings Guide
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly openai: OpenAI
  private readonly model: string
  private readonly dimensions: number

  constructor(options: OpenAIEmbeddingOptions) {
    this.openai = new OpenAI({ apiKey: options.apiKey })
    this.model = options.model ?? 'text-embedding-3-small'
    // text-embedding-3-small は 1536次元
    this.dimensions = this.model === 'text-embedding-3-small' ? 1536 : 3072
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.openai.embeddings.create({
      input: text,
      model: this.model
    })
    return res.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await this.openai.embeddings.create({
      input: texts,
      model: this.model
    })
    return res.data.map((item) => item.embedding)
  }

  getModelName(): string {
    return this.model
  }

  getDimensions(): number {
    return this.dimensions
  }
}
