# podcast-search オンボーディングガイド

> このガイドはコードベースの知識グラフから自動生成されました。
> 最終更新: 2026-03-26 | コミット: `03e97631`

---

## プロジェクト概要

**podcast-search** は、特定のポッドキャスト番組のエピソードを AI とベクトル検索で探し出すモノレポジトリです。

| 項目 | 内容 |
|------|------|
| バックエンド API | Hono (TypeScript) + Prisma + Pino |
| フロントエンド | React 18 + Vite + Tailwind CSS |
| ベクトル DB | Qdrant |
| Embedding | OpenAI API (text-embedding-3-small) |
| データベース | PostgreSQL (Supabase) |
| モノレポ管理 | Turborepo + pnpm |
| テスト | Jest + jest-cucumber (BDD) |

### リポジトリ構成

```
podcast_search/
├── apps/
│   ├── admin-ui/       # React 18 フロントエンド
│   └── api/            # Hono バックエンド API
└── packages/
    ├── config/         # 環境変数スキーマ (Zod)
    ├── database/       # Prisma ORM + リポジトリ
    └── search-core/    # セマンティック検索コア
```

---

## セットアップ

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp environments/.env.example environments/.env.development

# ローカル DB 起動 (Docker)
./compose-backend.sh

# DB マイグレーション + シード
pnpm db:migrate && pnpm db:seed

# 開発サーバー起動
pnpm dev
```

### 必要な環境変数（主要）

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 |
| `OPENAI_API_KEY` | OpenAI API キー |
| `QDRANT_URL` | Qdrant サーバー URL |
| `QDRANT_COLLECTION` | Qdrant コレクション名 |

詳細は `packages/config/src/env/common.ts` を参照。

---

## アーキテクチャレイヤー

このプロジェクトは6つの論理レイヤーで構成されています。

```
┌─────────────────────────────────────────────┐
│         Frontend Layer (admin-ui)            │
│  React 18 + Vite + React Query + Tailwind    │
└──────────────────────┬──────────────────────┘
                       │ HTTP (Hono Client RPC)
┌──────────────────────▼──────────────────────┐
│            API Layer (apps/api)              │
│         Hono REST API + Zod Validation       │
└──────┬───────────────────────────┬───────────┘
       │                           │
┌──────▼──────┐           ┌────────▼────────┐
│  Database   │           │  Search Core    │
│   Layer     │           │    Layer        │
│  (Prisma +  │           │ (Clean Arch.)   │
│  Supabase)  │           │  OpenAI+Qdrant  │
└──────┬──────┘           └────────┬────────┘
       │                           │
┌──────▼───────────────────────────▼─────────┐
│               Config Layer                  │
│         packages/config (Zod + env)         │
└────────────────────────────────────────────┘
         Tooling Layer (hooks, CI/CD, infra)
```

### Frontend Layer (`apps/admin-ui/`)

React 18 + Vite による管理画面。Tailwind CSS でスタイリングし、ポッドキャスト・エピソードの閲覧・検索 UI を提供する。**Hono の RPC クライアント（hc）** を通じてバックエンドと型安全に通信する。

**主要ファイル:**
- `src/main.tsx` — React エントリポイント、BrowserRouter でマウント
- `src/App.tsx` — ルートコンポーネント、React Query + React Router 設定
- `src/lib/api-client.ts` — Hono RPC クライアント初期化
- `src/api/` — episodes / podcasts / search の API クライアント関数
- `src/pages/` — PodcastList / PodcastDetail / EpisodeList / EpisodeDetail
- `src/components/SearchForm.tsx` — ベクトル検索フォーム

### API Layer (`apps/api/`)

Hono TypeScript バックエンド API。ポッドキャスト・エピソード・ベクトル検索の REST エンドポイントを提供し、`database` / `search-core` パッケージを組み合わせてリクエストを処理する。

**主要ファイル:**
- `src/index.ts` — Hono アプリエントリ、3ルートグループをマウント
- `src/lib/logger.ts` — pino ロガーシングルトン
- `src/routes/search.ts` — ベクトル検索エンドポイント（核心）
- `src/routes/episodes.ts` — エピソード CRUD
- `src/routes/podcasts.ts` — ポッドキャスト CRUD

### Search Core Layer (`packages/search-core/`)

OpenAI Embedding と Qdrant ベクトルストアを用いたセマンティック検索パッケージ。**Clean Architecture** に基づき `domain / application / infrastructure` の3層で構成。AWS Bedrock・OpenSearch への将来的な移行も想定した設計。

**主要ファイル:**
- `src/domain/` — EmbeddingProvider / VectorStore インターフェース定義
- `src/infrastructure/embedding/openai-embedding-provider.ts` — OpenAI 実装
- `src/infrastructure/vector-store/qdrant-store.ts` — Qdrant 実装
- `src/application/factory.ts` — 環境変数からインスタンス生成するファクトリ
- `src/index.ts` — SearchCore クラス（オーケストレーター）

### Database Layer (`packages/database/`)

Prisma ORM + Supabase PostgreSQL によるデータアクセス層。3モデル（Podcast / PodcastEpisode / TranscriptSegment）に対してリポジトリパターンを実装。

**主要ファイル:**
- `src/client.ts` — PrismaClient シングルトン
- `src/repositories/base.ts` — BaseRepository 抽象クラス
- `src/repositories/episode.ts` — EpisodeRepository（upsertByEnclosureUrl を含む）
- `src/repositories/podcast.ts` — PodcastRepository
- `src/repositories/transcript.ts` — TranscriptRepository
- `src/utils/normalizeEnclosureUrl.ts` — RSS URL 正規化ユーティリティ

### Config Layer (`packages/config/`)

Zod による環境変数スキーマ定義パッケージ。API・シード等の各アプリが参照する共通設定を一元管理し、型安全な環境変数アクセスを提供する。

- `src/env/common.ts` — 共通環境変数スキーマ
- `src/env/seed.ts` — シード専用スキーマ

### Tooling Layer

モノレポ全体の開発・デプロイ基盤。Claude/Cursor フック、Docker Compose 起動スクリプト、AWS インフラデプロイ、Jest 設定を含む。

---

## キーコンセプト

### 1. Clean Architecture in search-core

`packages/search-core` は依存性逆転の原則を徹底しています。

```
domain (interfaces)
  ↑ implements
infrastructure (OpenAI, Qdrant)
  ↑ creates
application (factory)
  ↑ uses
API layer
```

`EmbeddingProvider` と `VectorStore` はインターフェースとして定義されており、OpenAI → AWS Bedrock、Qdrant → AWS OpenSearch への移行は infrastructure 層の差し替えのみで完結します。`_wip/` ディレクトリに移行先のスタブが既に用意されています。

### 2. Hono の型安全 RPC クライアント

フロントエンドとバックエンドは Hono の `hc()` クライアントを通じて型安全に通信します。バックエンドのルート型をフロントエンドがインポートするため、API の変更はコンパイル時に検出できます。

### 3. リポジトリパターン

`BaseRepository` を抽象基底クラスとし、Prisma クライアントをコンストラクタ注入します。テスト時はモック Prisma クライアントを注入することで、DB なしでリポジトリのロジックを検証できます（`src/tests/helpers/mock-prisma.ts`）。

### 4. Zod による型安全な環境変数管理

`packages/config` では `z.object({...}).parse(process.env)` パターンで起動時に環境変数を検証します。不正な設定は本番デプロイ前に即座に検出できます。

---

## ガイドツアー

以下の順序でコードを読むと、全体像を効率よく把握できます。

### Step 1: 環境設定の基盤
**ファイル:** `packages/config/src/env/common.ts`, `packages/config/src/index.ts`

すべてのアプリが参照する共通設定の定義から始めます。どの外部サービス（DB・OpenAI・Qdrant）に依存しているかが一目で把握できます。

> **TypeScript Tip:** Zod は実行時バリデーションと型推論を同時に提供します。`z.infer<typeof schema>` で型を抽出できます。

### Step 2: データモデルとDBクライアント
**ファイル:** `packages/database/src/client.ts`, `packages/database/src/index.ts`

Prisma が管理する3テーブル（Podcast / PodcastEpisode / TranscriptSegment）がドメインの核です。

### Step 3: リポジトリパターン
**ファイル:** `packages/database/src/repositories/base.ts` → `episode.ts` → `podcast.ts`

BaseRepository を継承した各リポジトリの構造を確認します。`EpisodeRepository.upsertByEnclosureUrl` は RSS 取り込みの冪等性を保証する重要なメソッドです。

> **TypeScript Tip:** `abstract class` は共通ロジックを基底クラスにまとめ、サブクラスに実装を強制するパターンに最適です。

### Step 4: 検索ドメインのインターフェース
**ファイル:** `packages/search-core/src/domain/embedding/embedding-provider.ts`, `packages/search-core/src/domain/vector-store/vector-store.ts`

`EmbeddingProvider` と `VectorStore` の2インターフェースが検索コアの契約を定義します。実装に依存せず、この抽象に対してプログラムすることで拡張性を確保しています。

### Step 5 & 6: Infrastructure 実装
**ファイル:** `packages/search-core/src/infrastructure/embedding/openai-embedding-provider.ts`, `packages/search-core/src/infrastructure/vector-store/qdrant-store.ts`

OpenAI と Qdrant の具体実装。`QdrantStore` はフィルター変換ロジックを含む最も複雑なクラスです。`_wip/` の AWS 実装スタブも参照すると設計意図が分かります。

### Step 7: SearchCore クラスとファクトリ
**ファイル:** `packages/search-core/src/index.ts`, `packages/search-core/src/application/factory.ts`

`SearchCore` が `EmbeddingProvider` + `VectorStore` をオーケストレートします。`createSearchCoreFromEnv()` ファクトリで環境変数から一発でインスタンスを生成できます。

### Step 8 & 9: API エントリポイントとルート
**ファイル:** `apps/api/src/index.ts`, `apps/api/src/routes/search.ts`

Hono アプリの起動と、ベクトル検索エンドポイントの実装を確認します。`search.ts` では Step 1〜7 で学んだすべての層が連携する全体的なデータフローが見えます。

### Step 10: フロントエンドの API クライアント
**ファイル:** `apps/admin-ui/src/lib/api-client.ts`, `apps/admin-ui/src/api/search.ts`

Hono RPC クライアントでバックエンドの型安全な呼び出しを実現する仕組みを確認します。

> **TypeScript Tip:** Hono の `hc<AppType>(url)` はバックエンドのルート型をジェネリクスで受け取り、レスポンス型も自動推論します。

### Step 11: React UI
**ファイル:** `apps/admin-ui/src/App.tsx`, `apps/admin-ui/src/components/SearchForm.tsx`

React Query を使った非同期データ管理と、セマンティック検索 UI の実装を確認します。これが最終的なユーザー向けインターフェースです。

---

## ファイルマップ

### 優先的に読むべきファイル

| 優先度 | ファイル | 理由 |
|--------|---------|------|
| ★★★ | `packages/config/src/env/common.ts` | 全アプリの設定の起点 |
| ★★★ | `packages/database/src/repositories/episode.ts` | ドメインの核となるリポジトリ |
| ★★★ | `packages/search-core/src/index.ts` | 検索コアのパブリック API |
| ★★★ | `apps/api/src/routes/search.ts` | システム全体のデータフロー |
| ★★☆ | `packages/search-core/src/domain/vector-store/vector-store.ts` | 検索の抽象契約 |
| ★★☆ | `packages/search-core/src/application/factory.ts` | DI の仕組み |
| ★★☆ | `apps/api/src/index.ts` | API 全体の構成 |
| ★☆☆ | `apps/admin-ui/src/App.tsx` | フロントエンドのルーティング |

---

## 複雑度ホットスポット

以下のファイルは複雑度が高く、最初は読み流す程度にしておくことを推奨します。

| ファイル | 複雑度 | 注意点 |
|---------|--------|--------|
| `packages/database/src/generated/prisma/models/PodcastEpisode.ts` | **complex** | 自動生成。直接編集不可 |
| `packages/database/src/generated/prisma/models/TranscriptSegment.ts` | **complex** | 自動生成。直接編集不可 |
| `packages/database/src/generated/prisma/models/Podcast.ts` | **complex** | 自動生成。直接編集不可 |
| `packages/database/src/generated/prisma/internal/class.ts` | **complex** | Prisma 内部実装。直接編集不可 |
| `packages/database/src/generated/prisma/internal/prismaNamespace.ts` | **complex** | Prisma 内部実装。直接編集不可 |
| `packages/database/src/generated/prisma/commonInputTypes.ts` | **complex** | 自動生成の入力型定義 |
| `packages/search-core/src/infrastructure/vector-store/qdrant-store.ts` | **complex** | Qdrant フィルター変換ロジックを含む |
| `apps/admin-ui/src/pages/EpisodeDetail.tsx` | **complex** | トランスクリプト表示含む複合ページ |
| `apps/admin-ui/src/pages/PodcastDetail.tsx` | **complex** | エピソードリスト含む複合ページ |
| `apps/api/tests/episodes.steps.ts` | **complex** | BDD ステップ定義（jest-cucumber） |

> **Note:** `packages/database/src/generated/` 配下はすべて `pnpm db:generate` で自動生成されます。手動編集は不要です。

---

## よくある開発タスク

### 新しい API エンドポイントを追加する

1. `apps/api/src/routes/` に新しいルートファイルを作成
2. `apps/api/src/index.ts` でルートをマウント
3. フロントエンドの `apps/admin-ui/src/api/` に対応する API クライアント関数を追加
4. `apps/api/src/routes/*.test.ts` にテストを作成

### DB スキーマを変更する

1. `packages/database/prisma/schema.prisma` を編集
2. `pnpm db:migrate` でマイグレーション実行
3. 自動生成ファイルが更新される（`src/generated/` は手動編集不要）

### 検索の仕組みを変更・拡張する

1. `packages/search-core/src/domain/` のインターフェースを確認
2. 新しい実装は `packages/search-core/src/infrastructure/` に追加
3. `packages/search-core/src/application/factory.ts` でファクトリを更新

---

## 参考ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/architecture.md` | システムアーキテクチャ詳細 |
| `docs/data_model.md` | データモデル定義 |
| `docs/search_flow.md` | 検索フロー解説 |
| `docs/configuration.md` | 設定ガイド |
| `docs/DEPLOYMENT_GUIDE.md` | デプロイ手順 |
| `docs/contributing.md` | コントリビューションガイド |
| `docs/tech_debt.md` | 技術的負債トラッキング |
