# 設計方針・決定事項・改善タスク

本ドキュメントは、設計方針、決定事項、未決事項、改善タスク、リスク、受け入れ基準、ロードマップを整理します。

---

## 目的 / ユースケース

- Discord などの外部インタフェースから自然文クエリで RAG 検索し、関連エピソード（必要に応じて該当セグメント情報）を返す
- 運用で継続的に精度改善（再埋め込み、評価、フィードバック反映）できる

## スコープ（初期）

- 対象コンテンツ: ポッドキャスト番組のエピソード
- レスポンス: まずはエピソード単位。将来はセグメント単位（start/end/snippet）も返却
- インタフェース: REST API（将来: Discord Bot）

---

## 決定済み事項

### ID 戦略

- 内部: 数値 PK（将来 BigInt 化可）。JOIN と索引が軽い
- 外部: `publicId` を API/URL で露出（内部の数値 PK/FK は維持）
- Qdrant: pointId は `segmentId` ベース推奨。payload に `publicId` も保持可
- 公開IDは UUIDv4 を採用（Prisma の `@default(uuid())` を使用）

### publicId の露出範囲

- API（外向け）: エンドポイントのパス/パラメータ/レスポンスは publicId のみ
- URL/Permalink: publicId ベース
- 管理UI: ルーティング/リンクは publicId。画面には publicId を標準表示
- サービス間/バッチ（内部）: 数値IDでOK（JOIN性能重視）
- ログ/監査: 外向け共有ログは publicId、内部運用ログは publicId + 数値ID
- Qdrant: pointId は `segmentId`、payload に `publicEpisodeId/publicSegmentId` は任意

### データモデル

- スキーマ拡張: `Podcast`/`PodcastEpisode`/`TranscriptSegment`/`VectorRef`/`Tag`/`EpisodeTag`/`Source`/`ImportJob`/`User`/`GuildConfig`/`SearchQueryLog` を導入済み
- エピソード一意性: `PodcastEpisode.enclosureUrl` と `@@unique([podcastId, enclosureUrl])`
- 取得元管理: `PodcastSource`（enum `Provider`）で 1:N 管理
- セグメント時間: `startMs/endMs (Int)` に統一、`@@unique([episodeId, startMs, endMs])` と `@@index([episodeId, startMs])`
- VectorRef 一意性: `@@unique([segmentId, model, version])`
- 主要インデックス: `Episode(podcastId, publishedAt)`, `PodcastSource(podcastId, priority)`, `SearchQueryLog(createdAt)`
- `PodcastEpisode.podcastId` を必須化

### ベクトルストア（Qdrant）

- コレクション: `transcript_segments`（世代は `*_v1`/`*_v2` + エイリアス切替）
- 埋め込み: OpenAI `text-embedding-3-small`（1536 次元, distance=Cosine）
- payload（必須）: `segmentId`, `episodeId`, `podcastId`, `start`, `end`, `status`, `version`, `lang`
- payload index: `episodeId`/`podcastId`/`version`（integer）, `status`/`lang`/`model`（keyword）
- 検索フィルタ: `status == 'published'` と `version == current` は常時適用

### 取得元管理（Provider）

- 方式: enum 管理（`PodcastSource.provider` に `RSS/YOUTUBE/APPLE/SPOTIFY`）
- リレーション: `Podcast 1 — N PodcastSource`、`@@unique([podcastId, provider])`
- 項目: `externalId`（例: チャンネルID等）、`priority`、`isEnabled`、`config: json`
- 取得順序: priority が小さい順にトライ

---

## 未決事項（要決定）

- enclosureUrl 正規化ルール（追跡クエリ除去/リダイレクト解決/署名付きURL/HLS の扱い）
- チャンク既定値（長さ/オーバーラップ/境界判定）
- 非公開化フロー（Qdrant 削除 or `status='private'` 上書き、反映SLA）
- `Source`/`ImportJob` の種別・再試行・レート制御方針
- Discord ポリシー（レート/ロール/番組フィルタ/既定件数）
- セグメント長・オーバーラップの既定値
- Discord 側の権限制御（`GuildConfig` 詳細）
- フォールバック全文検索（`tsvector`）の導入可否

---

## 課題（残存）

- RDB と Qdrant の整合性: 非同期反映のズレ検知・修復手段（差分監査/レコンシリエーション）
- URL 正規化の難所: 署名付き一時URLや HLS(.m3u8)・多段リダイレクトの扱い
- 検索体験: セグメント返却/ハイライト/再ランキングが未実装
- チャンク品質: 無音/文境界優先の切り方のコード化
- レート/コスト: OpenAI/Qdrant のスロットリング・再試行・バッチ戦略が未確立
- 可観測性: メトリクス/構造化ログ/トレースが未定義
- 非公開/削除: 反映遅延時の漏洩リスクに対する二重ガード/監視が未
- API 互換性: 仕様固定とバージョニング未整備
- データ肥大: 長尺トランスクリプトのRDB保管リスク
- セキュリティ/濫用: Discord 経由の濫用や外部叩きへのレート制限/認可が未整備
- 多言語・人名曖昧性: 参加者抽出/エイリアス管理不在
- 取り込み重複: ミラー/再配信/URL変更時の運用ルール

---

## 改善タスク（優先度）

### P1（短期｜設計・データモデル優先）

- [ ] enclosureUrl 正規化ユーティリティを実装し取り込み時に適用
- [ ] インデックス最終確認（`Episode(podcastId,publishedAt DESC)`、`TranscriptSegment(episodeId,startMs)` ほか）

### P2（中期｜API/検索体験）

- [ ] `/search` レスポンスにセグメント情報（`segmentId/startMs/endMs/snippet/score/rank`）を追加（互換期間あり）
- [ ] `@podcast_search/search-core` にフィルタ（`status/version/lang`）、payload index 作成/存在確認、エイリアス運用（`*_v1`/`*_v2`）
- [ ] `docs/api_spec.md` 作成（API入出力の固定）
- [ ] ログ/評価（`SearchQueryLog`のみでの最小可視化方針）

### P3（中期〜）

- [ ] 再埋め込み v2 の実施とエイリアス切替（メトリクス監視込み）
- [ ] 非公開/削除フローの本実装（RDB 即時 + Qdrant 非同期）
- [ ] 管理UIの運用機能（再埋め込み・非公開切替・タグ付け）

---

## リスク/考慮

- 多言語の扱い（単一 vs 言語別コレクション/フィルタ）
- GDPR/削除要件（RDB/Qdrant の完全削除と遅延削除）
- 外部プレイヤーのディープリンク仕様（時間指定形式の統一）
- エピソード重複（ミラー/URL変更/再配信）の正規化戦略
- PII/監査（Discord ID の取り扱い）

---

## 受け入れ基準（DoD）

- `/search` がセグメント情報を返せる（互換モードあり）
- Qdrant に `status='published'` と `version==current` のフィルタ適用が可能（payload/index 作成済み）
- エイリアス切替で無停止で v2 へ移行できる手順書がある
- `publicId(UUIDv4)` と主要インデックスがスキーマ・実装に反映済み

---

## ロードマップ（目安）

- M1: P1 完了（設計・データモデルの固定と適用）
- M2: P2 完了（API拡張・search-core改善・API仕様ドキュメント）
- M3: P3 完了（再埋め込み切替・非公開フロー・管理UI）

---

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

---

## 非公開・削除対応

- 即時: RDB で `Episode.status` を変更（`published` → `private` など）
- 非同期: Qdrant ポイント削除 or `status='private'` へアップサート
- 常時ガード: 検索は Qdrant フィルタ + RDB 側でも公開状態を確認

---

## 監視・評価

- メトリクス: レイテンシ（p50/p95）、ヒット率、Qdrant 書込成功率、ポイント総数
- ログ/学習: `SearchQueryLog`/`SearchHit`/`Feedback` により品質改善ループ

---

## People/出演者（最小制約）

- 目的: 将来の出演者検索やフィルタに備えつつ、初期は最小コストで開始
- 最小スキーマ（slug なし）
  - Person: `id`（Int, PK）, `publicId`（UUIDv4, UNIQUE）, `primaryName`（String）, `normalizedPrimaryName`（String, INDEX）, `createdAt`, `updatedAt`
- 方針
  - 一意性は `publicId` で担保（外部IDは当初は保持しない）
  - 名前の一意制約は設けない（重名許容、検索用に `normalizedPrimaryName` へ索引）
  - slug は当初導入しない（人向けURLが必要になったら後から追加）

---

## 変更履歴

- 2025-..-..: 初版作成
- 2025-..-..: スキーマ拡張反映、タスク/差分を更新
- 2025-01-05: assumptions.md と統合、構成整理
