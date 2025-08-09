# 環境変数と設定

## 必須環境変数

- `DATABASE_URL` : PostgreSQL 接続文字列  
  例: `postgresql://user:password@localhost:5432/podcast?schema=public`
- `OPENAI_API_KEY` : OpenAI API キー  
- `QDRANT_URL` : Qdrant のエンドポイント URL（ローカル: `http://localhost:6333`）
- `PORT` : API のポート（省略時 3000）

`.env` 例:

```
# apps/api やルートから参照されます
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/podcast?schema=public
OPENAI_API_KEY=sk-xxx
QDRANT_URL=http://localhost:6333
```

## 共有設定パッケージ

- `@podcast_search/config` が `dotenv` を読み込み、Zod で環境変数を検証します。  
- API などからは `import { env } from '@podcast_search/config'` で参照可能。

## 開発時の注意

- `docker compose up -d` で Postgres と Qdrant を起動後に API を起動してください。  
- OpenAI API キーは組織ポリシーに従って安全に管理してください。


