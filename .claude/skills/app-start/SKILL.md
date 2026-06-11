---
name: app-start
description: Use when starting the podcast_search application locally via Docker, or when asked to launch all services
---

# アプリ起動（Docker）

## 前提

Supabase はホスト側で起動する（Docker Compose 外）。

## 手順

### 1. Supabase を起動

```bash
cd packages/database && npx supabase start
```

すでに起動中でも実行して OK（現在の状態が表示される）。

DB URL（Docker コンテナから接続する場合）:
`postgresql://postgres:postgres@host.docker.internal:54322/postgres`

### 2. アプリを起動

```bash
docker compose --profile backend up --build -d
```

- `--build`: イメージを再ビルド（コード変更後は必須）
- `-d`: バックグラウンド実行

### 3. 起動確認

```bash
docker ps --filter "name=podcast"
```

| サービス | URL |
|---|---|
| API | http://localhost:3000 |
| Admin UI | http://localhost:5173 |
| Qdrant | http://localhost:6333 |

api は qdrant が healthy になるまで待機し、admin-ui は api が healthy になるまで待機する。
初回は pnpm install を含むため数分かかる。

## ログ確認

```bash
docker compose logs -f api
docker compose logs -f admin-ui
```
