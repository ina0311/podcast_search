# 環境変数使用状況分析

## 現在の環境変数一覧

### 必須（現在使用中）

| 環境変数 | 使用箇所 | 必須/任意 | 説明 |
|---------|---------|----------|------|
| `NODE_ENV` | 全体 | 任意（デフォルト: 'development'） | 実行環境 |
| `PORT` | `apps/api/src/index.ts` | 任意（デフォルト: 3000） | APIポート番号 |
| `DATABASE_URL` | `packages/database/src/client.ts` | **必須** | PostgreSQL接続文字列 |
| `OPENAI_API_KEY` | `packages/search-core/src/application/factory.ts` | 任意（検索機能が無効化） | OpenAI APIキー |
| `OPENAI_EMBEDDING_MODEL` | `packages/search-core/src/application/factory.ts` | 任意（デフォルト: 'text-embedding-3-small'） | Embeddingモデル |
| `QDRANT_URL` | `packages/search-core/src/application/factory.ts` | 任意（Qdrant使用時） | Qdrant URL |
| `QDRANT_API_KEY` | `packages/search-core/src/application/factory.ts` | 任意（Qdrant Cloud使用時） | Qdrant APIキー |
| `QDRANT_COLLECTION_NAME` | `packages/search-core/src/application/factory.ts` | 任意（デフォルト: 'transcript_segments'） | コレクション名 |
| `ALLOWED_ORIGINS` | `apps/api/src/index.ts` | 任意（CORS設定） | CORS許可オリジン |

### 将来用（実装済みだが未使用）

| 環境変数 | 実装状況 | 説明 |
|---------|---------|------|
| `EMBEDDING_PROVIDER` | ✅ 実装済み | 'openai' または 'aws-bedrock' |
| `VECTOR_STORE` | ✅ 実装済み | 'qdrant'、'aws-opensearch'、'aws-bedrock-kb' |
| `AWS_REGION` | ✅ 実装済み（AWS Bedrock/OpenSearch用） | AWSリージョン |
| `AWS_ACCESS_KEY_ID` | ✅ 実装済み（AWS Bedrock/OpenSearch用） | AWSアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | ✅ 実装済み（AWS Bedrock/OpenSearch用） | AWSシークレットキー |
| `AWS_BEDROCK_EMBEDDING_MODEL` | ✅ 実装済み（AWS Bedrock用） | Bedrock Embeddingモデル |
| `AWS_OPENSEARCH_ENDPOINT` | ✅ 実装済み（AWS OpenSearch用） | OpenSearchエンドポイント |
| `AWS_OPENSEARCH_INDEX_NAME` | ✅ 実装済み（AWS OpenSearch用） | OpenSearchインデックス名 |

### 未実装の機能

| 機能 | 実装状況 | 環境変数 |
|------|---------|---------|
| AWS Bedrock Embedding Provider | ❌ 未実装（エラーを投げる） | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BEDROCK_EMBEDDING_MODEL` |
| AWS OpenSearch Store | ❌ 未実装（エラーを投げる） | `AWS_OPENSEARCH_ENDPOINT`, `AWS_OPENSEARCH_INDEX_NAME` |
| AWS Bedrock Knowledge Bases | ❌ 未実装（エラーを投げる） | `VECTOR_STORE='aws-bedrock-kb'` 時に使用 |

---

## 削除可能な設定の検討

### 結論：**現時点では削除不要**

理由：
1. **すべての環境変数は使用されている**
   - 現在使用中、または将来の実装で使用予定

2. **将来の拡張性**
   - AWS移行を考慮した設計（`docs/aws_bedrock_evaluation.md`参照）
   - 環境変数を変更するだけで実装を切り替え可能

3. **実装の一貫性**
   - `packages/search-core/src/application/factory.ts` で既に参照されている
   - 削除すると型エラーが発生する

---

## オプション：未実装機能の設定を削除する場合

もし**現時点でAWS移行の予定がない**場合、以下の設定を削除できます：

### 削除候補（未実装機能関連）

```typescript
// 削除可能な設定
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_BEDROCK_EMBEDDING_MODEL
- AWS_OPENSEARCH_ENDPOINT
- AWS_OPENSEARCH_INDEX_NAME
- VECTOR_STORE の 'aws-bedrock-kb' オプション
- EMBEDDING_PROVIDER の 'aws-bedrock' オプション
```

### 削除時の影響

1. **`packages/search-core/src/application/factory.ts` の修正が必要**
   - AWS関連のコードを削除
   - `AWSBedrockEmbeddingProvider` の参照を削除
   - `AWSOpenSearchStore` の参照を削除

2. **型定義の修正**
   - `SearchCoreFactoryOptions` からAWS関連のオプションを削除

3. **将来のAWS移行時に再実装が必要**

---

## 推奨：現状維持

### 理由

1. **YAGNI原則とのバランス**
   - 既に実装されている抽象化レイヤーを維持
   - 将来の拡張性を保持

2. **ポートフォリオとしての価値**
   - 「AWS移行も考慮した設計」をアピールできる
   - 技術選定の判断力を示せる

3. **実装コスト**
   - 環境変数の定義は軽量
   - 削除によるメリットが少ない

4. **ドキュメントとの整合性**
   - `docs/aws_bedrock_evaluation.md` でAWS移行を検討済み
   - 環境変数もそれに合わせて定義されている

---

## 代替案：コメントで明確化

削除せず、コメントで使用状況を明確化：

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(DEFAULT_API_PORT),
  DATABASE_URL: z.url(),

  // ============================================
  // 現在使用中
  // ============================================
  
  // Embedding Provider 設定
  EMBEDDING_PROVIDER: z.enum(['openai', 'aws-bedrock']).default('openai'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_EMBEDDING_MODEL: z
    .enum(['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'])
    .default('text-embedding-3-small'),

  // Vector Store 設定
  VECTOR_STORE: z.enum(['qdrant', 'aws-opensearch', 'aws-bedrock-kb']).default('qdrant'),
  QDRANT_URL: z.url().optional(),
  QDRANT_API_KEY: z.string().min(1).optional(),
  QDRANT_COLLECTION_NAME: z.string().default('transcript_segments'),

  ALLOWED_ORIGINS: z.string().optional(),

  // ============================================
  // 将来用（AWS移行時）
  // 実装状況: AWS Bedrock/OpenSearch は未実装（プレースホルダーのみ）
  // 詳細: docs/aws_bedrock_evaluation.md を参照
  // ============================================
  
  // AWS Bedrock 設定（将来用）
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BEDROCK_EMBEDDING_MODEL: z.string().default('amazon.titan-embed-text-v1'),

  // AWS OpenSearch 設定（将来用）
  AWS_OPENSEARCH_ENDPOINT: z.string().url().optional(),
  AWS_OPENSEARCH_INDEX_NAME: z.string().default('transcript_segments'),
})
```

---

## まとめ

### 推奨：**現状維持**

- ✅ すべての環境変数は使用されている（現在または将来）
- ✅ 将来の拡張性を保持
- ✅ ポートフォリオとしての価値
- ✅ 実装コストが低い

### 削除を検討する場合

以下の条件が揃った場合のみ削除を検討：
- AWS移行の予定が全くない
- コードベースを最小限に保ちたい
- 将来の再実装を許容できる

### 改善案

削除せず、コメントで使用状況を明確化することを推奨します。
