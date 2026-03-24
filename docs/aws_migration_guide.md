# AWS移行ガイド

本プロジェクトは、AWS Bedrock/ベクトルサービスへの移行を容易にするため、抽象化レイヤーを実装しています。

## アーキテクチャ

```
┌─────────────────────────────────────────┐
│         SearchCore (統一インターフェース) │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌──────▼──────────┐
│ Embedding   │  │ Vector Store     │
│ Provider    │  │                  │
└──────┬──────┘  └──────┬───────────┘
       │                │
  ┌────┴────┐      ┌────┴────┐
  │ OpenAI  │      │ Qdrant  │
  │ Bedrock │      │OpenSearch│
  └─────────┘      └─────────┘
```

## 現在の実装

### Embedding Provider
- ✅ **OpenAI**: `OpenAIEmbeddingProvider` - 実装済み
- 🔜 **AWS Bedrock Titan**: `AWSBedrockEmbeddingProvider` - プレースホルダー（将来実装）

### Vector Store
- ✅ **Qdrant**: `QdrantStore` - 実装済み
- 🔜 **AWS OpenSearch**: `AWSOpenSearchStore` - プレースホルダー（将来実装）
- 🔜 **AWS Bedrock Knowledge Bases**: 将来実装予定

## AWS移行手順

### Step 1: 環境変数の設定

現在（Qdrant + OpenAI）:
```bash
EMBEDDING_PROVIDER=openai
VECTOR_STORE=qdrant
OPENAI_API_KEY=sk-...
QDRANT_URL=http://localhost:6333
```

AWS移行後:
```bash
EMBEDDING_PROVIDER=aws-bedrock
VECTOR_STORE=aws-opensearch
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_OPENSEARCH_ENDPOINT=https://...
AWS_BEDROCK_EMBEDDING_MODEL=amazon.titan-embed-text-v1
```

### Step 2: AWS実装の完成

#### 2.1 AWS Bedrock Embedding Provider

`packages/search-core/src/providers/aws-bedrock-embedding.ts` を実装:

```ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { EmbeddingProvider } from './embedding'

export class AWSBedrockEmbeddingProvider implements EmbeddingProvider {
  private readonly client: BedrockRuntimeClient
  private readonly model: string

  constructor(options: AWSBedrockEmbeddingOptions) {
    this.client = new BedrockRuntimeClient({
      region: options.region ?? 'us-east-1',
      credentials: options.credentials
    })
    this.model = options.model ?? 'amazon.titan-embed-text-v1'
  }

  async embed(text: string): Promise<number[]> {
    const command = new InvokeModelCommand({
      modelId: this.model,
      body: JSON.stringify({ inputText: text })
    })
    const response = await this.client.send(command)
    const result = JSON.parse(new TextDecoder().decode(response.body))
    return result.embedding
  }

  // ... 他のメソッドを実装
}
```

#### 2.2 AWS OpenSearch Vector Store

`packages/search-core/src/providers/aws-opensearch-store.ts` を実装:

```ts
import { OpenSearchClient } from '@opensearch-project/opensearch'
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws'
import type { VectorStore } from './vector-store'

export class AWSOpenSearchStore implements VectorStore {
  private readonly client: OpenSearchClient
  private readonly indexName: string

  constructor(options: AWSOpenSearchStoreOptions) {
    this.client = new OpenSearchClient({
      ...AwsSigv4Signer({
        region: options.region ?? 'us-east-1',
        credentials: options.credentials
      }),
      node: options.endpoint
    })
    this.indexName = options.indexName ?? 'transcript_segments'
  }

  async search(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]> {
    const response = await this.client.search({
      index: this.indexName,
      body: {
        size: options?.limit ?? 10,
        query: {
          knn: {
            vector_field: {
              vector,
              k: options?.limit ?? 10
            }
          }
        }
      }
    })
    // 結果を変換して返す
  }

  // ... 他のメソッドを実装
}
```

### Step 3: 依存関係の追加

```bash
pnpm add @aws-sdk/client-bedrock-runtime @opensearch-project/opensearch
```

### Step 4: テスト

```bash
# 環境変数を設定してテスト
EMBEDDING_PROVIDER=aws-bedrock \
VECTOR_STORE=aws-opensearch \
AWS_REGION=us-east-1 \
pnpm test
```

## 段階的移行戦略

### Phase 1: Embedding Provider のみ移行

```bash
EMBEDDING_PROVIDER=aws-bedrock
VECTOR_STORE=qdrant  # まだQdrantを使用
```

### Phase 2: Vector Store のみ移行

```bash
EMBEDDING_PROVIDER=openai  # まだOpenAIを使用
VECTOR_STORE=aws-opensearch
```

### Phase 3: 完全移行

```bash
EMBEDDING_PROVIDER=aws-bedrock
VECTOR_STORE=aws-opensearch
```

## コード変更の最小化

抽象化レイヤーのおかげで、AWS移行時は以下のコード変更のみで対応できます：

1. ✅ **環境変数の変更**: 実装を切り替える
2. ✅ **AWS実装の完成**: プレースホルダーを実装
3. ✅ **依存関係の追加**: AWS SDKを追加

**既存のコード（`SearchCore`を使用している箇所）は一切変更不要**です。

## 実装例

### 現在の使用方法

```ts
import { createSearchCoreFromEnv } from '@podcast_search/search-core'

const searchCore = createSearchCoreFromEnv()
const results = await searchCore.searchByQuery('UMAの起源', 10)
```

### AWS移行後も同じコード

```ts
// 環境変数が変わっても、コードは同じ！
import { createSearchCoreFromEnv } from '@podcast_search/search-core'

const searchCore = createSearchCoreFromEnv()
const results = await searchCore.searchByQuery('UMAの起源', 10)
```

## 参考資料

- [AWS Bedrock Knowledge Bases vs Qdrant 評価](./aws_bedrock_evaluation.md)
- [ベクトルストア設計ガイド](./vector_store.md)
- [検索フロー](./search_flow.md)
