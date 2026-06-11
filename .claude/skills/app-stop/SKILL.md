---
name: app-stop
description: Use when stopping the podcast_search application Docker services, or when asked to shut down all services
---

# アプリ停止（Docker）

## 通常停止

```bash
docker compose --profile backend down
```

## コンテナが停止できない場合（zombie プロセス）

admin-ui コンテナが zombie プロセスを含む場合、`down` がエラーになる。

```bash
docker kill $(docker ps -q --filter "name=podcast") 2>/dev/null
docker rm $(docker ps -aq --filter "name=podcast") 2>/dev/null
```

### 根本対策

`docker-compose.yml` の admin-ui サービスに `init: true` を追加すると zombie が発生しなくなる:

```yaml
admin-ui:
  init: true   # ← 追加
  build: ...
```

## Supabase の停止

Supabase は Docker Compose 外で動いているため、別途停止が必要:

```bash
cd packages/database && npx supabase stop
```

## 停止確認

```bash
docker ps --filter "name=podcast"
# 出力なし = 全停止
```
