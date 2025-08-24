# 🚀 Podcast Search - クイックスタートガイド

npmエラーを解決し、background agentを簡単に起動する方法です。

## 📋 問題の解決

お客様が遭遇したnpmエラーは、このプロジェクトが**pnpm**を使用しているにも関わらず、`npm`コマンドで実行しようとしたことが原因と思われます。

## 💻 ローカルインストール版（Docker不要）

このプロジェクトは**Docker Desktopを必要としません**。すべてローカルにインストールして動作します。

### Background Agent の構成

| サービス | 種類 | インストール方法 |
|---------|------|----------------|
| **API Server** | Node.js | pnpm（標準） |
| **Admin UI** | React | pnpm（標準） |
| **PostgreSQL** | データベース | Homebrew/APT |
| **Qdrant** | ベクトルDB | バイナリダウンロード |

## ⚡ クイックスタート

### 1. フルセットアップ（初回のみ）

```bash
# すべてを自動でセットアップ
./install.sh
```

### 2. Background Servicesの起動

```bash
# PostgreSQL + Qdrant + API + Admin UI をすべて起動
./start-background-services.sh
```

### 3. サービス確認

起動後、以下のURLにアクセス可能です：

- **API Server**: http://localhost:3001
- **Admin UI**: http://localhost:5173  
- **PostgreSQL**: localhost:5432
- **Qdrant**: http://localhost:6333

## 🔧 個別操作

### 環境の確認
```bash
./install.sh status                        # 初期セットアップ状態確認
./start-background-services.sh status      # サービス状態確認
```

### サービス管理
```bash
# 起動
./start-background-services.sh

# 停止
./start-background-services.sh stop

# 再起動
./start-background-services.sh restart

# データベースのみ停止
./start-background-services.sh stop-db

# ログ確認
./start-background-services.sh logs
./start-background-services.sh logs api
./start-background-services.sh logs ui
```

### トラブルシューティング
```bash
# 完全クリーンアップ
./install.sh clean

# PostgreSQL手動起動（macOS）
brew services start postgresql@16

# PostgreSQL手動起動（Linux）
sudo systemctl start postgresql
```

## ⚠️ 重要な注意点

1. **pnpmを使用してください**（npmではなく）
   ```bash
   npm install -g pnpm@10.14.0  # 初回のみ
   pnpm install                 # プロジェクトの依存関係
   ```

2. **OpenAI API Keyの設定**
   ```bash
   # apps/api/.env.local を編集
   OPENAI_API_KEY="your-actual-api-key-here"
   ```

3. **必要なソフトウェア**
   - Node.js (v18以上)
   - PostgreSQL (v16推奨)
   - pnpm (v10.14.0)

## 🛠️ 手動での開発

背景サービスが起動した状態で、個別に開発する場合：

```bash
# API サーバーのみ
pnpm run dev:api

# Admin UI のみ  
pnpm run dev:admin-ui

# 両方同時に
pnpm run dev
```

## 📊 サービス構成

| サービス | ポート | 用途 |
|---------|--------|------|
| API Server | 3001 | REST API |
| Admin UI | 5173 | 管理画面 |
| PostgreSQL | 5432 | メインDB |
| Qdrant | 6333 | ベクトルDB |

## 🔍 ログとデバッグ

```bash
# リアルタイムログ
./start-background-services.sh logs

# API ログのみ
./start-background-services.sh logs api

# PostgreSQLログ確認（macOS）
brew services info postgresql@16

# Qdrantログ確認
tail -f qdrant-local.log
```

## 💡 軽量＆高速な理由

- **Docker不要**: コンテナオーバーヘッドなし
- **ネイティブ実行**: OS最適化されたパフォーマンス
- **低メモリ**: 必要最小限のリソース使用
- **高速起動**: サービス即座起動

これでPodcast Searchのbackground agentが軽量かつ高速に起動し、開発を開始できます！