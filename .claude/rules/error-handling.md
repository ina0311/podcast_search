# エラーハンドリング規約

## ロギング

- `console.log` / `console.error` の直書き禁止
- 将来的に pino logger へ移行予定（tech_debt P1）
- 移行前は `console.error` のみ許容（`console.log` は debug 用途のみ、コミット前に削除）

## Hono のエラーレスポンス

```typescript
import { HTTPException } from 'hono/http-exception'

// 4xx エラー
throw new HTTPException(404, { message: 'Episode not found' })
throw new HTTPException(400, { message: 'Invalid query parameter' })

// 5xx は原則キャッチして返す
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

## Zod バリデーションエラー

```typescript
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const schema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
})

// zValidator が自動で 400 を返す
app.get('/search', zValidator('query', schema), async (c) => {
  const { q, limit } = c.req.valid('query')
  // ...
})
```

## 外部サービスエラー

- Qdrant / Supabase のエラーは文字列マッチングではなく型チェックで判定
- SDK が提供するエラー型を使う

```typescript
// Bad
if (err.message.includes('connection refused')) { ... }

// Good
import { QdrantClientError } from '@qdrant/js-client-rest'
if (err instanceof QdrantClientError) { ... }
```

## エラーメッセージ

- ユーザー向け: 短く・具体的に（例: `'Query is required'`）
- 開発者向けログ: スタックトレースを含める
- 機密情報（DB 接続文字列等）はレスポンスに含めない
