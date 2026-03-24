/**
 * AWS Bedrock Titan Embedding Provider 実装（将来用）
 *
 * AWS移行時に実装します。
 * 現時点ではプレースホルダーとして作成しています。
 */

import type { EmbeddingProvider } from '../../../domain'

export interface AWSBedrockEmbeddingOptions {
  region?: string
  model?: string
  credentials?: {
    accessKeyId: string
    secretAccessKey: string
  }
}

/**
 * AWS Bedrock Titan Embedding Provider 実装（将来用）
 *
 * 実装例:
 * ```ts
 * import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
 *
 * export class AWSBedrockEmbeddingProvider implements EmbeddingProvider {
 *   private readonly client: BedrockRuntimeClient
 *   private readonly model: string
 *
 *   constructor(options: AWSBedrockEmbeddingOptions) {
 *     this.client = new BedrockRuntimeClient({
 *       region: options.region ?? 'us-east-1',
 *       credentials: options.credentials
 *     })
 *     this.model = options.model ?? 'amazon.titan-embed-text-v1'
 *   }
 *
 *   async embed(text: string): Promise<number[]> {
 *     const command = new InvokeModelCommand({
 *       modelId: this.model,
 *       body: JSON.stringify({ inputText: text })
 *     })
 *     const response = await this.client.send(command)
 *     const result = JSON.parse(new TextDecoder().decode(response.body))
 *     return result.embedding
 *   }
 *
 *   // ... 他のメソッド
 * }
 * ```
 */
export class AWSBedrockEmbeddingProvider implements EmbeddingProvider {
  constructor(_options: AWSBedrockEmbeddingOptions) {
    throw new Error(
      'AWS Bedrock Embedding Provider is not yet implemented. ' +
        'This is a placeholder for future AWS migration.'
    )
  }

  async embed(_text: string): Promise<number[]> {
    throw new Error('Not implemented')
  }

  async embedBatch(_texts: string[]): Promise<number[][]> {
    throw new Error('Not implemented')
  }

  getModelName(): string {
    return 'amazon.titan-embed-text-v1'
  }

  getDimensions(): number {
    return 1536
  }
}
