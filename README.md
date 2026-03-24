# Podcast Search

特定のポッドキャスト番組のエピソードを AI とベクトル検索で探し出すモノレポジトリ。

## 技術スタック

- バックエンド: Hono (TypeScript) + Zod + Prisma + Pino  
- フロントエンド: React 18 + Vite + Tailwind CSS + DaisyUI + Radix UI + TanStack Query  
- パッケージ管理 / モノレポ: pnpm Workspaces  
- データベース: PostgreSQL 16 (Docker) + Prisma ORM  
- ベクトルDB: Qdrant (Docker)  
- Embedding: OpenAI Embedding API (text-embedding-3-small)  
- 音声文字起こし: Whisper CLI  
- デプロイ: Vercel (Frontend) + AWS App Runner (Backend) + Supabase (Database) / ローカル docker-compose  
- Discord連携: discord.js  

## 技術選定理由

- バックエンド（Hono + TypeScript）
  - 軽量・高速でエッジ/サーバレス適性が高い。APIルータ/ミドルウェアがシンプルで型補完が効きやすい
  - ESM対応が素直。Expressより軽量、Fastify同等の速度で学習コストが低い

- Zod
  - ランタイムバリデーションとTS型推論を一元化して“スキーマを単一の真実”にできる
  - class-validator/yup比で関数型・合成がしやすく、境界（env/query/body）で再利用しやすい

- Prisma
  - 型安全なクエリ/マイグレーションでDXが高い。スキーマ駆動で保守が容易
  - TypeORM/Knex比で型整備と開発速度に優れ、PostgreSQLとの相性も良好

- Pino（ロギング）
  - 高速・低オーバーヘッドで構造化JSONログを標準化。本番の集約・検索と親和性が高い
  - 子ロガー/マスキング（redaction）/非同期トランスポートにより運用機能が充実
  - 比較: Winstonは多機能だが重くなりがち、MorganはHTTP専用寄り、Bunyanはエコシステム面で相対的に弱い

- フロントエンド（React 18 + Vite）
  - React 18の並行特性と成熟したエコシステム。ViteでHMR/ビルドが高速でDXが良い
  - Next.js等のSSRが不要な管理画面用途に合致

- Tailwind CSS
  - ユーティリティファーストで実装速度と一貫性を両立。CSS-in-JS比でランタイムオーバーヘッドが小さい

- DaisyUI
  - Tailwind前提の部品で試作〜実装を加速。テーマ切替やアクセシビリティの下支え

- Radix UI
  - a11yを満たす低レベルプリミティブを提供。デザイン自由度を損なわずに土台を確保

- TanStack Query
  - フェッチのキャッシュ/再検証/エラー/リトライを標準化し、状態管理の重複を削減
  - Redux等でサーバーキャッシュを扱う代替より意図が明確

- pnpm Workspaces（モノレポ）
  - 高速かつ厳密な依存解決。`workspace:*` で内部パッケージ連携が容易。npm/yarn比で速度/ディスク効率が高い

- PostgreSQL 16 + Prisma
  - 安定・実績豊富で整合性に強いRDB。Prismaの型安全なアクセスと相性が良い
  - SQLiteは単体用途向け、MySQL系は好みだが本件はトランザクション/機能面でPostgreSQLを選定

- Qdrant（ベクトルDB）
  - 自前ホスティングが容易でコスト効率が良い。HNSWベースで検索性能が高く、ペイロード管理が強力
  - Pinecone等のマネージド比でコスト/ロックイン耐性に利点。Milvusより軽量に運用しやすい

- OpenAI Embedding（text-embedding-3-small）
  - コスト効率と多言語（日本語含む）で十分な精度のバランスが良い。次元数・レイテンシも適度

- Whisper CLI
  - 高精度の音声文字起こしを簡易に扱える。バッチ/自動化に適し、パイプラインに組み込みやすい

- デプロイ（Vercel + AWS App Runner + Supabase / ローカル）
  - 本番環境: Vercel で Frontend、AWS App Runner で Backend、Supabase で Database
  - 軽量なローカル開発環境（docker-compose）
  - 詳細は [デプロイガイド](docs/DEPLOYMENT_GUIDE.md) を参照

- discord.js
  - エコシステムとドキュメントが充実。Bot作成が容易で通知・連携に適する

注: Admin UIの一部ライブラリ（Tailwind/DaisyUI/Radix UI、TanStack Query）は現状最小利用ですが、将来のUI拡張と非同期処理の標準化を見据えて採用しています。

## ディレクトリ構成

```text
apps/              # 実行可能なアプリケーション
  ├─ api/          # Hono API
  └─ admin-ui/     # 管理画面 (React)
packages/          # 共有ライブラリ
  ├─ config/       # 環境変数の型安全なロード (Zod)
  ├─ database/     # Prisma クライアント + リポジトリ層
  └─ search-core/  # OpenAI Embedding + Qdrant 検索
docs/              # ドキュメント
infra/             # インフラ設定 (AWS等)
commands/          # AI用プロンプト (レビュー/コミット)
pnpm-workspace.yaml
```

## パッケージアーキテクチャ

### 責務分担

```
apps/api (アプリケーション層・ビジネスロジック)
    ↓ 依存
┌────────────────────────────────────────────────┐
│  search-core         database                  │
│  (ベクトル検索)       (RDBアクセス)             │
└────────────────────────────────────────────────┘
        ↓ 相互に依存しない（独立）
```

### `@podcast_search/database`

**責務**: RDBへのデータアクセスを抽象化

- Prismaクライアントのシングルトン管理
- **リポジトリパターン**によるデータアクセス層（`EpisodeRepository`, `PodcastRepository`, `TranscriptRepository`）
- Prisma型の再エクスポート

```typescript
import { EpisodeRepository } from '@podcast_search/database';
const repo = new EpisodeRepository();
const episodes = await repo.findByIds([1, 2, 3]);
```

### `@podcast_search/search-core`

**責務**: ベクトル検索機能に特化（RDBアクセスは持たない）

- **抽象化レイヤー**: Embedding Provider と Vector Store を抽象化し、実装を切り替え可能
- OpenAI Embedding / AWS Bedrock Titan Embedding に対応
- Qdrant / AWS OpenSearch / AWS Bedrock Knowledge Bases に対応
- 検索クエリのZodスキーマ

```typescript
// 環境変数から自動選択（推奨）
import { createSearchCoreFromEnv } from '@podcast_search/search-core';
const searchCore = createSearchCoreFromEnv();
const hits = await searchCore.searchByQuery('キーワード', 10);

// または明示的に指定
import { SearchCore } from '@podcast_search/search-core';
const searchCore = new SearchCore({ openaiApiKey, qdrantUrl });
const hits = await searchCore.searchByQuery('キーワード', 10);
// hits = [{ id, score, payload: { episodeId } }]
```

**AWS移行**: 環境変数を変更するだけで、AWS Bedrock/OpenSearch に切り替え可能。詳細は [AWS移行ガイド](docs/aws_migration_guide.md) を参照。

### 設計原則

1. **単一責任の原則**: 各パッケージは1つの責務に集中
2. **依存の方向**: `apps/` → `packages/`（逆方向は禁止）
3. **パッケージ間の独立**: `search-core` と `database` は相互に依存しない
4. **リポジトリパターン**: データアクセスは `database` パッケージのリポジトリを通す

## 開発

```bash
# pnpm ワークスペース全体を開発モードで起動
pnpm run dev
```

## Docker Backend Stack

Docker 版のバックエンド（API + Postgres + Qdrant）は、どこからでも次のスクリプトで起動できます。

```bash
/Users/inabaryo/workspace/portfolio/podcast_search/compose-backend.sh up -d
```

任意の Docker Compose サブコマンド（`logs`, `down`, など）は、第2引数以降に渡してください。内部的には `docker compose -f /Users/.../docker-compose.yml --profile backend ...` を実行します。

## 技術選定の考え方

本プロジェクトでは、以下の理由から Qdrant + OpenAI + Whisper CLI を採用しました：

1. **コスト効率**: 小規模プロジェクトでは無料枠または低コストで運用可能
2. **実装の簡潔性**: シンプルで保守しやすいアーキテクチャ
3. **柔軟性**: ベンダーロックインを避け、将来の選択肢を保持

AWS Bedrock/ベクトルサービスへの移行も検討しましたが、現時点では過剰な投資と判断しました。詳細は [AWS移行評価](docs/aws_bedrock_evaluation.md) を参照してください。

**ただし、AWS移行を容易にするため、抽象化レイヤーを実装しています。** 将来的にスケール要件が明確になった際は、環境変数を変更するだけで AWS に移行できます。詳細は [AWS移行ガイド](docs/aws_migration_guide.md) を参照してください。

## 詳細ドキュメント

- [アーキテクチャ](docs/architecture.md)
- [データモデル](docs/data_model.md)
- [ベクトルストア設計](docs/vector_store.md)
- [検索フロー](docs/search_flow.md)
- [環境変数と設定](docs/configuration.md)
- [設計方針・改善タスク](docs/improvements.md)
- [デプロイ](docs/deployment.md) - [完全デプロイガイド](docs/DEPLOYMENT_GUIDE.md)（Cursor エージェント対応）
- [AWS移行ガイド](docs/aws_migration_guide.md) - AWS Bedrock/OpenSearch への移行手順
- [AWS移行評価](docs/aws_bedrock_evaluation.md) - 技術選定の評価と判断根拠
- [Contributing](docs/contributing.md)
- [AWSインフラ構成](infra/aws/README.md)

## ライセンス
