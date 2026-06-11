# Podcast Ingestion Pipeline 設計書

**日付**: 2026-04-09  
**対象**: RSS → MP3 → Whisper → Embedding → Qdrant の取り込みパイプライン

---

## 背景・目的

現状、DB とベクトルストア（Qdrant）にデータを投入する手段がない。  
本パイプラインにより、`Podcast.rssUrl` を持つ全ポッドキャストを対象に RSS フィードから自動でエピソードを取り込み、検索可能な状態にする。

---

## アーキテクチャ

```
apps/api/src/
├── domains/                             # ビジネスロジック・ユースケース
│   └── import/
│       ├── import-podcast.usecase.ts   # 取り込みのオーケストレーター
│       └── job-store.ts                # インメモリのジョブ状態管理
├── routes/                              # HTTP ルート（薄い）
│   ├── admin.ts                        # 新規: POST /admin/ingest, GET /admin/ingest/status
│   ├── search.ts
│   ├── episodes.ts
│   └── podcasts.ts
├── middleware/                          # HTTP ミドルウェア
│   └── auth.ts                         # API キー認証
├── services/                            # 外部サービスとの連携
│   ├── rss/
│   │   └── rss-fetcher.ts              # RSS フィード取得・enclosure URL 抽出
│   └── transcription/
│       ├── audio-downloader.ts         # MP3 ダウンロード（一時ファイル）
│       └── whisper-runner.ts           # Whisper CLI 実行・出力パース
└── index.ts
```

### 依存の方向

```
routes/ → domains/ → services/
                   → packages/database      (Episode / TranscriptSegment upsert)
                   → packages/search-core   (Embedding + Qdrant upsert)
```

- `routes/` は受け取って渡すだけ（HTTP の関心事のみ）
- `domains/` が何をするかを知っている（ユースケース）
- `services/` はどうやるかを知っている（外部サービスとの連携）
- `services/` はどのドメインからも利用可能

新規依存: `fast-xml-parser`（RSS パース）

---

## API

### `POST /admin/ingest`

- 認証: `X-Admin-Key` ヘッダー（環境変数 `ADMIN_API_KEY` と照合）
- レスポンス: `202 Accepted` + `{ jobId: string }`
- バックグラウンドで `pipeline.run()` を非同期起動

### `GET /admin/ingest/status`

- 認証: 同上
- レスポンス例:

```json
{
  "status": "running",
  "total": 25,
  "done": 12,
  "errors": [
    { "episodeId": 5, "message": "whisper exited with code 1" }
  ]
}
```

`status` は `idle | running | done | error` のいずれか。

---

## データフロー

```
POST /admin/ingest
  → job_id を発行し 202 を即返却
  → バックグラウンドで pipeline.run() を非同期起動

pipeline.run()
  1. DB から rssUrl を持つ全 Podcast を取得
  2. 各 Podcast の RSS フィードを fetch
  3. <enclosure> の url をデコード → CloudFront MP3 URL を抽出
  4. DB に PodcastEpisode を upsert（enclosureUrl による冪等性）
  5. 未処理エピソードごとに:
     a. MP3 を /tmp にダウンロード
     b. whisper <file> --output_format json を実行（タイムアウト: 10分）
     c. JSON をパース → TranscriptSegment を DB に upsert
     d. テキストを Embedding → Qdrant に upsert
     e. /tmp の音声ファイルを削除
```

### enclosure URL のデコード

RSS の `<enclosure>` url は以下の形式:

```
https://anchor.fm/s/1c492214/podcast/play/{episode_id}/{URL_encoded_cloudfront_url}
```

末尾の URL エンコード部分をデコードすると CloudFront 直リンクの MP3 URL が得られる。

---

## セキュリティ

認証ミドルウェアは `http/middleware/auth.ts` に分離し、`/admin/*` ルート全体に適用する。

```typescript
// http/middleware/auth.ts
app.use('/admin/*', async (c, next) => {
  const key = c.req.header('X-Admin-Key')
  if (key !== env.ADMIN_API_KEY) throw new HTTPException(401, { message: 'Unauthorized' })
  await next()
})
```

`ADMIN_API_KEY` は環境変数として `packages/config` に追加する。

---

## エラーハンドリング

- エピソード単位で try/catch し、1件の失敗で全体を止めない
- 失敗したエピソードは `errors` 配列に記録し処理を続行
- 主な失敗パターン:

| パターン | 対処 |
|---|---|
| MP3 ダウンロード失敗 | スキップ・ログ |
| Whisper CLI 失敗 / タイムアウト | スキップ・ログ |
| Embedding 失敗 | スキップ・ログ |
| 一時ファイル削除失敗 | ログのみ（致命的でない） |

---

## テスト方針

```
apps/api/src/services/rss/
  rss-fetcher.test.ts                - fetch モック、enclosure URL デコードの検証

apps/api/src/services/transcription/
  audio-downloader.test.ts           - HTTP レスポンスモック、ファイル書き込み検証
  whisper-runner.test.ts             - child_process モック、出力パース検証

apps/api/src/domains/import/
  import-podcast.usecase.test.ts     - 各サービスをモック、フロー全体の検証

apps/api/src/routes/
  admin.test.ts                      - API キー認証、202レスポンス、status レスポンス検証
```

E2E テストはローカル docker-compose 環境（API + PostgreSQL + Qdrant）で手動確認。

---

## 将来の拡張

- ジョブ状態を DB カラムに移行（インメモリ → 永続化）
- Cron による定期実行（新エピソードの自動取り込み）
- 並列処理（エピソードを並列でダウンロード・文字起こし）
