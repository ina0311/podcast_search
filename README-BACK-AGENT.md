# Podcast Search - Cursor Back Agent

Cursor Back Agent用に最適化されたPodcast Searchプロジェクトです。

## 要件

- **OS**: Linux (Ubuntu/Debian)
- **Node.js**: LTS版
- **pnpm**: 最新版
- **PostgreSQL**: 16+
- **Qdrant**: 1.8+

## クイックスタート

### 1. 初回セットアップ

```bash
./install-back-agent.sh
```

このスクリプトが以下を自動実行します：
- Node.js & pnpm インストール
- PostgreSQL セットアップ
- Qdrant インストール
- プロジェクト依存関係インストール
- データベース初期化

### 2. 開発サーバー起動

```bash
# すべてのサービスを起動
pnpm run dev

# または個別起動
./start-background-services.sh  # Background Services
pnpm run dev:api                # API Server
pnpm run dev:admin-ui           # Admin UI
```

### 3. サービス管理

```bash
# サービス状態確認
./start-background-services.sh status

# サービス停止
./start-background-services.sh stop

# サービス再起動
./start-background-services.sh restart
```

## サービスURL

- **API Server**: http://localhost:3001
- **Admin UI**: http://localhost:5173
- **PostgreSQL**: localhost:5432
- **Qdrant**: http://localhost:6333

## 環境変数

`apps/api/.env.local` ファイルで以下の設定が可能：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/podcast"
QDRANT_URL="http://localhost:6333"
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
OPENAI_API_KEY="your-api-key"
```

## トラブルシューティング

### systemd エラー

```
System has not been booted with systemd as init system (PID 1). Can't operate.
```

**解決法**: WSL環境の場合、PostgreSQL を手動起動してください：

```bash
sudo service postgresql start
```

### ポートエラー

ポートが使用中の場合：

```bash
# プロセス確認
lsof -i :3001
lsof -i :5173
lsof -i :6333

# プロセス終了
kill -9 <PID>
```

### 依存関係エラー

```bash
# キャッシュクリア
pnpm store prune

# 再インストール
rm -rf node_modules
pnpm install
```

## 開発フロー

1. **コード編集**: プロジェクトファイルを編集
2. **自動リロード**: dev サーバーが自動的に変更を検知
3. **テスト**: API と UI が自動更新
4. **デバッグ**: ログファイルで詳細確認

## ログファイル

- **API Server**: `api.log`
- **Admin UI**: `admin-ui.log`
- **Qdrant**: `qdrant-local.log`

## パフォーマンス

- **起動時間**: 約30秒
- **メモリ使用量**: 約500MB
- **CPU使用率**: 低負荷時 < 5%

Back Agent環境での快適な開発をお楽しみください！
