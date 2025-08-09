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
- デプロイ: Render (Docker) / ローカル docker-compose  
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

- デプロイ（Render + Docker / docker-compose）
  - Dockerでローカルと本番の差異を最小化。Renderは小規模構成での運用開始が容易

- discord.js
  - エコシステムとドキュメントが充実。Bot作成が容易で通知・連携に適する

注: Admin UIの一部ライブラリ（Tailwind/DaisyUI/Radix UI、TanStack Query）は現状最小利用ですが、将来のUI拡張と非同期処理の標準化を見据えて採用しています。

## ディレクトリ構成

```text
apps/         # 実行可能なアプリケーション
  ├─ api/     # Hono API
  └─ admin-ui/# 管理画面 (React)
packages/     # 共有ライブラリ (db など)
docker-compose.yml
pnpm-workspace.yaml
```

## 開発

```bash
# 依存をインストール
pnpm install

# ローカル環境を起動（Postgres + Qdrant）
docker compose up -d

# API と Admin UI を同時に開発モードで起動
pnpm dev
```

## 詳細ドキュメント

- [アーキテクチャ](docs/architecture.md)
- [検索フロー](docs/search_flow.md)
- [デプロイ](docs/deployment.md)
- [Contributing](docs/contributing.md)
- [環境変数と設定](docs/configuration.md)

## ライセンス
