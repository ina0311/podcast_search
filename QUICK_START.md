# Podcast Search - クイックスタート

## 必要なソフトウェア

- **Node.js**: v18 以上
- **pnpm**: v10.14.0
- **PostgreSQL**: v16 推奨
- **Qdrant**: v1.8+

## セットアップ

### 1. 依存関係のインストール

```bash
# pnpmのインストール（初回のみ）
npm install -g pnpm@10.14.0

# プロジェクトの依存関係をインストール
pnpm install
```

### 2. データベースとQdrantの起動

#### 方法A: Docker Compose（推奨）

```bash
# バックエンドサービスを起動（PostgreSQL + Qdrant + API）
./compose-backend.sh up -d

# ログを見る
./compose-backend.sh logs -f

# 停止
./compose-backend.sh down
```

#### 方法B: Linux環境（Back Agent用）

```bash
# 自動セットアップ（Linux専用）
./install-back-agent.sh
```

### 3. 環境変数の設定

```bash
# apps/api/.env.local を編集
OPENAI_API_KEY="your-api-key"  # 未設定でもAPIは起動（/search は 503）
```

### 4. 開発サーバーの起動

```bash
# API + Admin UI を同時に起動
pnpm run dev

# 個別に起動する場合
pnpm run dev:api        # API サーバーのみ
pnpm run dev:admin-ui   # Admin UI のみ
```

## サービスURL

| サービス | ポート | URL |
|---------|--------|-----|
| API Server | 3001 | http://localhost:3001 |
| Admin UI | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | localhost:5432 |
| Qdrant | 6333 | http://localhost:6333 |

## トラブルシューティング

### npm エラーが出る場合

このプロジェクトは `pnpm` を使用しています。`npm` ではなく `pnpm` を使ってください。

```bash
pnpm install --frozen-lockfile
```

### ポート競合

```bash
# 使用中のポートを確認
lsof -i :3001
lsof -i :5173

# プロセスを終了
kill -9 <PID>
```

### データベース接続エラー

```bash
# Prismaクライアントの再生成
pnpm run db:generate

# マイグレーション実行
pnpm run db:migrate
```

## 詳細ドキュメント

- [README.md](README.md) - プロジェクト概要・技術スタック
- [docs/](docs/) - 詳細ドキュメント（アーキテクチャ、設定、デプロイ等）
