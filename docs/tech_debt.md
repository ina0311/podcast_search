# 技術的負債・コード品質課題

コードレビューで特定された課題と対応TODO。完了したらチェックを入れること。

最終調査日: 2026-03-09

---

## P0 — 即時対応（本番運用前に必須）

### 1. API ルートのテストカバレッジが 0%

**問題**
`apps/api/src/routes/` 配下の全ルートにテストが存在しない。検索・エピソード・ポッドキャストAPIのリグレッション検知が不可能。

**対象ファイル**
- `apps/api/src/routes/search.ts`
- `apps/api/src/routes/episodes.ts`
- `apps/api/src/routes/podcasts.ts`

**TODO**
- [x] `apps/api/src/routes/search.test.ts` を作成
  - [x] 正常系: ヒット複数件のレスポンス形式確認
  - [x] 正常系: ヒット0件
  - [x] 異常系: `query` パラメータなし → 400
  - [x] 異常系: `limit` に文字列 → 400
  - [x] 異常系: searchCore 未初期化時 → 503
- [x] `apps/api/src/routes/episodes.test.ts` を作成
  - [x] 正常系: 存在するID → 200 + エピソード
  - [x] 異常系: 存在しないID → 404
  - [x] 異常系: 数値でないID → 400
- [x] `apps/api/src/routes/podcasts.test.ts` を作成
  - [x] 正常系・404・400 の各ケース
- [ ] `packages/search-core` の統合テスト（embedding + vector store）追加
  - [ ] `normalizeEnclosureUrl` のユニットテスト（http→https変換、UTMパラメータ除去、無効URL）

---

### 2. SearchCore 初期化のグローバル状態依存

**問題**
`search.ts:13-21` で `searchCore` をモジュールレベルのグローバル変数に保持している。初期化失敗時のエラーメッセージのみ保存 → デバッグ情報が不足。並行リクエスト時の競合状態リスクがある。

```typescript
// 現状 (search.ts:13-21)
let searchCore: SearchCore | null = null
let searchCoreInitError: string | null = null
try {
  searchCore = createSearchCoreFromEnv()
} catch (error) {
  searchCoreInitError = error instanceof Error ? error.message : String(error)
  searchCore = null
}
```

**TODO**
- [ ] 初期化をアプリ起動時の1回のみに限定し、失敗時はプロセスを終了させる設計に変更
- [ ] エラーオブジェクト全体を保持するか、構造化ログに出力する
- [ ] または DI（依存性注入）パターンで `searchCore` をリクエストスコープから切り離す

---

### 3. `as any` / 不安全なキャストの排除

**問題**
型安全性を損なうキャストが複数箇所に存在する。

| ファイル | 行 | 問題 |
|---------|-----|------|
| `packages/database/src/repositories/__tests__/episode.test.ts` | 16 | `new EpisodeRepository(mockPrisma as any)` |
| `packages/search-core/src/infrastructure/vector-store/qdrant-store.ts` | 68 | `qdrantFilter as Parameters<...>[1]['filter']` |
| `packages/search-core/src/infrastructure/embedding/openai-embedding-provider.ts` | 33, 41 | `as unknown as number[]` の二重キャスト |

**TODO**
- [x] `episode.test.ts:16` — `mockPrisma` に適切な型定義を付与（`as any` を排除）
- [x] `qdrant-store.ts:68` — Qdrant SDK の正しいフィルタ型を使用して明示的に型付け
- [x] `openai-embedding-provider.ts:33,41` — `as unknown as` の二重キャストをなくし、OpenAI SDK のレスポンス型を正しく扱う

---

## P1 — 短期対応（2週間以内）

### 4. 環境変数スキーマの必須/任意の不整合

**問題**
`packages/config/src/env/common.ts` で実行時に必須な変数が `optional()` になっており、起動時エラーが遅延検出になる。

```typescript
// 問題箇所 (common.ts)
QDRANT_URL: z.url().optional(),      // ❌ SearchCore に必須なのに optional
QDRANT_API_KEY: z.string().min(1).optional(),  // こちらは任意でOK
// AWS Bedrock 設定が完全に欠落
```

**TODO**
- [ ] `OPENAI_API_KEY` と `QDRANT_URL` を `optional()` から必須フィールドに変更
- [ ] プロバイダー別に環境変数スキーマを分割（例: `SearchCoreEnvSchema` を独立定義）
- [ ] AWS Bedrock への移行を見据えたフィールド追加（`AWS_REGION`, `AWS_BEDROCK_MODEL_ID` など）
- [ ] `factory.ts` 内の重複した手動バリデーションを削除（スキーマ側で担保する）

---

### 5. Qdrant エラー判定が文字列マッチングで脆弱

**問題**
`qdrant-store.ts:98-105` でエラーの種類を `error.message.includes('Not found')` という文字列マッチングで判定している。Qdrant SDK のバージョンアップやメッセージ変更で壊れるリスクがある。

**TODO**
- [ ] Qdrant SDK の公式エラーオブジェクト・HTTPステータスコードを使った判定に変更
- [ ] 一時的エラー（408/504 など）と永続的エラー（404）を区別してハンドリング
- [ ] エラー発生時の詳細ログ出力を追加

---

### 6. 構造化ログ（pino）が未使用

**問題**
`pino` が依存関係に含まれているにもかかわらず、コード内では `console.error`/`console.log` が直書きされている。本番環境での分析・アラート連携が困難。

**TODO**
- [ ] `apps/api/src/lib/logger.ts` を作成し、pino インスタンスを初期化
- [ ] `apps/api/src/index.ts` で logger を初期化してアプリ全体に提供
- [ ] 全ルートの `console.error` / `console.log` を logger に置き換え
- [ ] ログフォーマットを JSON に統一（本番: JSON、開発: pretty-print）
- [ ] リクエスト単位でリクエストID（`x-request-id`）をログに含める

---

### 7. 未実装スタブが本番コードに混在

**問題**
AWS Bedrock/OpenSearch への移行用プレースホルダーが `throw new Error('Not implemented')` のまま本番コードに存在する。誤って呼び出された場合に実行時エラーになる。

**対象ファイル**
- `packages/search-core/src/infrastructure/embedding/aws-bedrock-embedding-provider.ts`（`embed`, `embedBatch` が未実装）
- `packages/search-core/src/infrastructure/vector-store/aws-opensearch-store.ts`（全メソッドが未実装）

**TODO**
- [x] スタブ実装を別ディレクトリ（例: `src/infrastructure/_wip/`）に移動して誤使用を防ぐ
- [ ] または、AWS SDK の依存追加と実装を行う（`@aws-sdk/client-bedrock-runtime` など）
- [ ] `factory.ts` でプロバイダー選択時に未実装プロバイダーを選べないようバリデーション追加

---

## P2 — 中期対応（1ヶ月以内）

### 8. API に認証・認可機構がない

**問題**
`apps/api/` の全エンドポイントに認証がない。CORS の許可リストは設定済みだが、APIキーやトークンによる認証が未実装。

**TODO**
- [ ] 認証方式を決定（APIキー / Bearer JWT / どちらも）
- [ ] `apps/api/src/middleware/auth.ts` を作成
- [ ] 全ルートに認証ミドルウェアを適用（ヘルスチェック `/health` は除外）
- [ ] 環境変数でAPIキーを管理し、設定スキーマに追加

---

### 9. `/search` レスポンスにセグメント情報がない

**問題**
`docs/improvements.md` の P2 タスクに記載されているが未実装。現状はエピソードIDのみ返却しており、検索でヒットしたトランスクリプトのどの箇所かが分からない。

**現在のレスポンス**
```json
{ "episodes": [...], "hitsCount": 10 }
```

**目標レスポンス**
```json
{
  "results": [
    {
      "episode": { "id": "...", "title": "..." },
      "segments": [
        { "segmentId": 1, "startMs": 60000, "endMs": 65000, "snippet": "...", "score": 0.95 }
      ]
    }
  ],
  "totalHits": 10
}
```

**TODO**
- [ ] `VectorSearchResult` にセグメント情報（`startMs`, `endMs`, `snippet`, `score`）を含める
- [ ] Qdrant の payload から `segmentId`, `startMs`, `endMs` を取得できるよう `qdrant-store.ts` を修正
- [ ] `/search` レスポンス形式を変更（後方互換のため `?format=v2` などのフラグ検討）
- [ ] `docs/api_spec.md` を作成してレスポンス仕様を固定

---

### 10. `/search` にページネーションがない

**問題**
`/search` は `limit` のみサポートしており `offset` がない。大量ヒット時の次ページ取得が不可能。

**TODO**
- [ ] `offset` クエリパラメータを追加（デフォルト: 0）
- [ ] Qdrant の `searchByQuery` に `offset` を渡せるよう `SearchCore` インターフェースを拡張
- [ ] レスポンスに `nextOffset` または `hasMore` を追加

---

### 11. RDB と Qdrant の整合性担保

**問題**
`search.ts:44-47` で Qdrant から取得した `episodeId` をもとに DB を検索しているが、両者の同期タイミングにズレが生じる可能性がある（Episode 削除後も Qdrant にポイントが残るなど）。

**TODO**
- [ ] Episode 削除時に Qdrant のポイントも削除するロジックを実装
- [ ] 定期バッチで RDB と Qdrant の差分を検出・修復するスクリプトを作成
- [ ] `status='published'` フィルタを Qdrant 検索時に常時適用（payload index 確認）

---

## メモ・補足

- テストフレームワーク: Vitest（既存テストに合わせる）
- ログライブラリ: pino（`package.json` に依存あり）
- 認証設計は Discord Bot 連携を視野に入れて検討すること
- AWS 移行（`docs/aws_migration_guide.md`）が確定したら P1-7 の未実装スタブを本実装に差し替える
