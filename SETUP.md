# Podcast Search - セットアップガイド

## 🚀 クイックスタート

### 1. 自動インストール（Docker不要）

```bash
# リポジトリをクローン
git clone <repository-url>
cd podcast_search

# 自動インストールスクリプトを実行（PostgreSQL + Qdrant をローカルインストール）
./install.sh
```

### 2. 環境変数の設定

APIサーバーが動作するために、OpenAI API キーの設定が必要です：

```bash
# apps/api/.env.local ファイルを編集
nano apps/api/.env.local

# OPENAI_API_KEY の値を実際のキーに変更
OPENAI_API_KEY="your-actual-openai-api-key-here"
```

### 3. Background Servicesの起動

```bash
# すべてのサービスを背景で起動（PostgreSQL + Qdrant + API + Admin UI）
./start-background-services.sh

# または手動でAPI + Admin UIのみ起動
pnpm run dev

# または個別に起動
pnpm run dev:api        # APIサーバーのみ
pnpm run dev:admin-ui   # Admin UIのみ
```

## 📊 サービスURL

- **API Server**: http://localhost:3001
- **Admin UI**: http://localhost:5173  
- **PostgreSQL**: localhost:5432
- **Qdrant (ベクトルDB)**: http://localhost:6333

## 🔧 コマンドリファレンス

### install.sh - 環境セットアップ
```bash
./install.sh           # フルインストール
./install.sh status     # インストール状態確認
./install.sh stop       # ローカルサービス停止
./install.sh help       # ヘルプ表示
```

### start-background-services.sh - Background Agent管理
```bash
./start-background-services.sh         # すべてのサービス起動
./start-background-services.sh status  # サービス状態確認
./start-background-services.sh stop    # すべてのサービス停止
./start-background-services.sh restart # サービス再起動
./start-background-services.sh logs    # ログ表示
```

## ⚠️ トラブルシューティング

### npmエラーが発生する場合

このプロジェクトは`pnpm`を使用します。`npm`を使わずに以下を実行してください：

```bash
# pnpmのインストール
npm install -g pnpm@10.14.0

# 依存関係のインストール
pnpm install --frozen-lockfile
```

### ローカルサービスが起動しない場合

```bash
# PostgreSQLの確認
psql --version
brew services list | grep postgresql  # macOS
systemctl status postgresql           # Linux

# Qdrantの確認
qdrant --version

# サービス再起動
./start-background-services.sh restart
```

### データベース接続エラー

```bash
# PostgreSQLコンテナの状態確認
docker logs podcast_postgres

# Prismaクライアントの再生成
pnpm run db:generate

# マイグレーション再実行
pnpm run db:migrate
```

### ポート競合エラー

他のアプリケーションが以下のポートを使用していないか確認：
- 3001 (API Server)
- 5173 (Admin UI)
- 5432 (PostgreSQL)
- 6333 (Qdrant)

```bash
# ポート使用状況確認（macOS）
lsof -i :3001
lsof -i :5432
lsof -i :6333

# 既存プロセスの停止
./start-background-services.sh stop
```

## 🔒 環境変数の説明

| 変数名 | 説明 | デフォルト値 |
|--------|------|-------------|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://user:password@localhost:5432/podcast` |
| `QDRANT_URL` | Qdrant接続URL | `http://localhost:6333` |
| `OPENAI_API_KEY` | OpenAI APIキー | 設定が必要 |
| `PORT` | APIサーバーポート | `3001` |
| `NODE_ENV` | 実行環境 | `development` |
| `LOG_LEVEL` | ログレベル | `info` |

## 🏗️ 手動セットアップ（詳細）

自動インストールが失敗する場合の手動手順：

### 1. 必要なツールのインストール

```bash
# pnpm
npm install -g pnpm@10.14.0

# corepack有効化
corepack enable
corepack prepare pnpm@10.14.0 --activate

# PostgreSQL（macOS）
brew install postgresql@16
brew services start postgresql@16

# PostgreSQL（Linux）
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql

# Qdrant（自動ダウンロード）
mkdir -p ~/.local/bin
# macOS
curl -L "https://github.com/qdrant/qdrant/releases/download/v1.8.1/qdrant-x86_64-apple-darwin.tar.gz" | tar xz -C ~/.local/bin
# Linux
curl -L "https://github.com/qdrant/qdrant/releases/download/v1.8.1/qdrant-x86_64-unknown-linux-gnu.tar.gz" | tar xz -C ~/.local/bin
```

### 2. データベース設定

```bash
# PostgreSQL データベース作成
createdb podcast  # macOS
sudo -u postgres createdb podcast  # Linux
```

### 3. 依存関係とビルド

```bash
pnpm install --frozen-lockfile
pnpm run build:packages
```

### 4. データベース初期化

```bash
pnpm run db:generate
pnpm run db:migrate
```

### 5. 環境変数設定

```bash
# 自動作成されるので編集してOpenAI API keyを設定
nano apps/api/.env.local
```

## 🧪 開発用コマンド

```bash
# 型チェック
pnpm run typecheck

# 個別パッケージの型チェック
pnpm run typecheck:packages
pnpm run typecheck:api
pnpm run typecheck:admin-ui

# データベース操作
pnpm run db:generate    # Prismaクライアント生成
pnpm run db:migrate     # マイグレーション実行
pnpm run db:push        # スキーマをDBにプッシュ
pnpm run db:format      # Prismaスキーマフォーマット
```

## 📋 必要な前提条件

- **Node.js**: v18 以上
- **pnpm**: v10.14.0
- **PostgreSQL**: v16 推奨
- **curl**: Qdrantダウンロード用
- **OpenAI API Key**: Embeddingとテキスト処理用

### 自動インストールされるもの
- **Qdrant**: バイナリが自動ダウンロードされます
- **Node.js依存関係**: pnpmで自動インストールされます

## 🎯 次のステップ

1. [アーキテクチャドキュメント](docs/architecture.md)を確認
2. [検索フロー](docs/search_flow.md)を理解
3. [API仕様](apps/api/README.md)を確認
4. [コントリビューティングガイド](docs/contributing.md)を参照
