# デプロイ

## ローカル開発環境

```bash
# 依存関係をインストール
pnpm install

# Postgres と Qdrant を起動
docker compose up -d

# 開発サーバーを並列起動（API + Admin UI）
pnpm dev
```

## Render へのデプロイ

1. Render ダッシュボードで新規 Blueprint （`render.yaml`）を作成し、リポジトリを指定します。  
2. `main` ブランチへ push すると、Render が自動でビルド・デプロイを行います。  
3. 環境変数は Render 上で設定しておきます。例:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `QDRANT_URL`

## イメージビルド

`Dockerfile` は multi-stage 構成になっており、最終イメージにはビルド済みファイルのみを含めています。
