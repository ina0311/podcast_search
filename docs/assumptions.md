# システム想定と設計方針

## 目的 / ユースケース
- Discord などの外部インタフェースから自然文クエリで RAG 検索し、関連エピソード（必要に応じて該当セグメント情報）を返す。
- 運用で継続的に精度改善（再埋め込み、評価、フィードバック反映）できる。

## スコープ（初期）
- 対象コンテンツ: ポッドキャスト番組のエピソード
- レスポンス: まずはエピソード単位。将来はセグメント単位（start/end/snippet）も返却
- インタフェース: REST API（将来: Discord Bot）

## データモデル方針
- エンティティ分離: `Podcast`（番組）/ `Episode`（エピソード）/ `TranscriptSegment`（セグメント）
- 公開ID: 外部公開・連携用に `publicId`（UUID/CUID）を `Podcast`/`Episode`/`TranscriptSegment` に付与
- 公開状態: `Episode.status`（`published`/`private`/`removed`/`draft`）と `visibilityChangedAt`
- ベクトル参照: `VectorRef` で Qdrant ポイントを追跡（`qdrantPointId`, `model`, `version`, `isActive` など）

## ベクトルストア（Qdrant）
- コレクション: `transcript_segments`（世代は `*_v1`/`*_v2` + エイリアス切替）
- 埋め込み: OpenAI `text-embedding-3-small`（1536 次元, distance=Cosine）
- payload（必須）: `segmentId`, `episodeId`, `podcastId`, `start`, `end`, `status`, `version`, `lang`
- payload index: `episodeId`/`podcastId`/`version`（integer）, `status`/`lang`/`model`（keyword）
- 検索フィルタ: `status == 'published'` と `version == current` は常時適用

## スケール前提 / チャンク設計
- チャンク: 30–60 秒/セグメント、オーバーラップ 5–10 秒（目安 300–500 トークン）
- 規模例: 1.5h/話 → 120–180 セグメント。300 話で ~54k セグメント → Qdrant 数 GB 以内

## API の振る舞い
- 検索: クエリ → 埋め込み → Qdrant 近傍 → `episodeId` をユニーク化し RDB から取得
- 将来拡張: セグメント情報（`segmentId`, `start`, `end`, `snippet`, `score`, `rank`）を返却

## 非公開・削除対応
- 即時: RDB で `Episode.status` を変更（`published` → `private` など）
- 非同期: Qdrant ポイント削除 or `status='private'` へアップサート
- 常時ガード: 検索は Qdrant フィルタ + RDB 側でも公開状態を確認

## 自動ジョブ（毎週）
- パイプライン: 取得（RSS/手動）→ 文字起こし → チャンク → 埋め込み upsert（バッチ）→ RDB/Qdrant 登録
- 冪等性: `Episode.url`（または外部 ID）を一意キーにし UPSERT。セグメントは `(episodeId,start,end)` ハッシュで冪等化
- 分離: API とワーカーを別プロセス/コンテナ・別プール設定にし相互干渉を抑制
- 再埋め込み: 新コレクション（v2）作成 → バックフィル → エイリアス切替

## 同時アクセス / デッドロック対策
- 短いトランザクション（エピソード単位）、更新順序の固定（Episode→Segment）
- 一意制約＋UPSERT（`episode(url)`、`transcript_segment(episodeId,start,end)`）
- API とワーカーのコネクションプール分離・上限設定。ワーカー並行数の制限
- Qdrant への書き込みはバッチ upsert＋スロットリング

## ID 戦略
- 内部: 数値 PK（将来 BigInt 化可）。JOIN と索引が軽い
- 外部: `publicId` を API/URL で露出（内部の数値 PK/FK は維持）
- Qdrant: pointId は `segmentId` ベース推奨。payload に `publicId` も保持可

### publicId の露出範囲（スコープ別の使い分け）
- API（外向け）: エンドポイントのパス/パラメータ/レスポンスは publicId のみ（互換期間は受け口だけ数値IDも許容しつつ段階廃止）
- URL/Permalink: publicId ベース（必要ならスラッグ併用 `/episodes/:publicId-:slug`）
- 管理UI: ルーティング/リンクは publicId。画面には publicId を標準表示、数値IDは詳細表示・コピー用に限定
- サービス間/バッチ（内部）: 数値IDでOK（JOIN性能重視）。外部公開しない
- ログ/監査: 外向け共有ログは publicId、内部運用ログは publicId + 数値ID（必要時）
- Qdrant: pointId は `segmentId`、payload に `publicEpisodeId/publicSegmentId` は任意で同梱

### 実装チェックリスト
## 取得元管理（Provider）
- 方式: 当面は enum 管理（`PodcastSource.provider` に `RSS/YOUTUBE/APPLE/SPOTIFY`）
- リレーション: `Podcast 1 — N PodcastSource`、`@@unique([podcastId, provider])`
- 項目: `externalId`（例: チャンネルID等）、`priority`、`isEnabled`、`config: json`
- 取得順序: priority が小さい順にトライ（rss → youtube → ...）
- 将来拡張: プロバイダ横断の集計や資格情報管理が必要になったら `Provider` テーブル導入（M:N）
- スキーマ: `publicId` に Unique、内部FKは数値（済）
- ルーター: `/:publicId` で取得→内部数値IDへ解決。旧 `/:id` は短期 301 リダイレクト
- API DTO: `id` を返さず `publicId` を返却（数値IDは非公開）
- 管理UI: 画面・URLとも `publicId` ベース。内部IDは開発者向けに限定
- Qdrant: pointId=segmentId、payloadに公開IDを必要に応じて含める

### 決定事項（最終）
- 公開IDは UUIDv4 を採用（Prisma の `@default(uuid())` を使用）
- 内部PKは数値（当面は `Int`、必要になれば `BigInt` へ拡張）
- JOIN・参照は数値IDで行い、API/URL/外部連携には `publicId(UUIDv4)` を使用

Prisma 設計例（概念）
```prisma
model PodcastEpisode {
  id        Int    @id @default(autoincrement())
  publicId  String @unique @default(uuid()) @db.Uuid
  // ...
}

model TranscriptSegment {
  id        Int    @id @default(autoincrement())
  publicId  String @unique @default(uuid()) @db.Uuid
  // ...
}
```

理由（要点）
- セキュリティ/IDOR 防止（連番を外部に晒さない）
- 内部の最適化（数値IDで索引が小さく JOIN が速い）
- 互換性（内部PKの型変更や再設計が外部に波及しない）

並び替え/ページングの推奨
- 並び替えは `ORDER BY createdAt DESC, id DESC`
- 大量ページングはキーセット方式（`(createdAt,id)`）
- 必要に応じて複合インデックス `(createdAt DESC, id DESC)`

JOIN が多い場合の最適化
- 外部キー列に B-Tree インデックス必須
- クエリ形に合わせて複合インデックス（例: `Episode(podcastId, publishedAt DESC)`）
- 取得列は限定し、必要ならカバリングインデックス

## マイグレーション / 導入
- 基本方針: 追加 → バックフィル → 制約/フィルタ適用。無停止で段階導入可
- 一括導入も可（現時点で本番データなし）。後方互換が要る場合は段階導入を選択

## 監視・評価
- メトリクス: レイテンシ（p50/p95）、ヒット率、Qdrant 書込成功率、ポイント総数
- ログ/学習: `SearchQueryLog`/`SearchHit`/`Feedback` により品質改善ループ

## 未決事項（要確認）
- `publicId` の形式（UUIDv4/v7, CUID2）
- セグメント長・オーバーラップの既定値
- Discord 側の権限制御（`GuildConfig` 詳細）
- フォールバック全文検索（`tsvector`）の導入可否

## People/出演者（最小制約）
- 目的: 将来の出演者検索やフィルタに備えつつ、初期は最小コストで開始
- 最小スキーマ（slug なし）
  - Person
    - `id`（Int, PK）
    - `publicId`（UUIDv4, UNIQUE）
    - `primaryName`（String）
    - `normalizedPrimaryName`（String, INDEX）
    - `createdAt`, `updatedAt`
- 方針
  - 一意性は `publicId` で担保（外部IDは当初は保持しない）
  - 名前の一意制約は設けない（重名許容、検索用に `normalizedPrimaryName` へ索引）
  - slug は当初導入しない（人向けURLが必要になったら後から追加）
