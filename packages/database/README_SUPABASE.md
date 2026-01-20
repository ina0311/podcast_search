# Supabase CLI ローカル開発環境

このプロジェクトでは Supabase CLI を使用してローカル開発環境を構築できます。

## セットアップ

### 1. Supabase CLI のインストール

```bash
# macOS (Homebrew)
brew install supabase/tap/supabase

# または npm (Node.js 20+ が必要)
npm install supabase --save-dev
```

### 2. Supabase プロジェクトの初期化

```bash
cd packages/database
supabase init
```

### 3. ローカルスタックの起動

```bash
# Docker Desktop を起動してから実行
supabase start
```

起動後、以下の情報が表示されます：

```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
```

### 4. 環境変数の設定

`.env.development` または環境変数で以下を設定：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### 5. Prisma マイグレーションの適用

```bash
# プロジェクトルートから
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
pnpm db:generate
pnpm db:deploy
```

## よく使うコマンド

```bash
# ローカルスタックの起動
supabase start

# ローカルスタックの停止
supabase stop

# データベースのリセット（マイグレーションを再適用）
supabase db reset

# Supabase Studio を開く（ブラウザ）
open http://localhost:54323
```

## docker-compose.yml との関係

Supabase CLI を使う場合、`docker-compose.yml` の `postgres` サービスは不要です。
`qdrant` サービスは引き続き使用できます。

## 参考

- [Supabase CLI ドキュメント](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase Studio](http://localhost:54323) - ローカル開発環境のデータベース管理UI
