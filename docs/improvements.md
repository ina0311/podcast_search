# 改善点・未決事項トラッカー

本ドキュメントは、現状の決定事項・未決事項・改善タスク・リスク・受け入れ基準・ロードマップを簡潔に整理します。

## 決定済み
- ID 方針: 内部は数値PK、外部は `publicId(UUIDv4)`。URL/API は `publicId` を露出
- スキーマ拡張: `Podcast`/`PodcastEpisode`/`TranscriptSegment`/`VectorRef`/`Tag`/`EpisodeTag`/`Source`/`ImportJob`/`User`/`GuildConfig`/`SearchQueryLog` を導入済み（MVPでは `SearchHit/Feedback` は未採用）
- エピソード一意性: `PodcastEpisode.enclosureUrl` と `@@unique([podcastId, enclosureUrl])`
- 取得元管理: `PodcastSource`（enum `Provider`）で 1:N 管理
- publicId 露出範囲: 外向きは `publicId`、内部JOINは数値ID
- セグメント時間: `startMs/endMs (Int)` に統一、`@@unique([episodeId, startMs, endMs])` と `@@index([episodeId, startMs])`
- VectorRef 一意性: `@@unique([segmentId, model, version])`
- 主要インデックス: `Episode(podcastId, publishedAt)`, `PodcastSource(podcastId, priority)`, `SearchQueryLog(createdAt)`
- `PodcastEpisode.podcastId` を必須化

## 未決事項（要決定）
- enclosureUrl 正規化ルール（追跡クエリ除去/リダイレクト解決/署名付きURL/HLS の扱い）
- チャンク既定値（長さ/オーバーラップ/境界判定）
- 非公開化フロー（Qdrant 削除 or `status='private'` 上書き、反映SLA）
- `Source`/`ImportJob` の種別・再試行・レート制御方針
- Discord ポリシー（レート/ロール/番組フィルタ/既定件数）

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

## 改善タスク（優先度）
- P1（短期｜設計・データモデル優先）
  - [ ] enclosureUrl 正規化ユーティリティを実装し取り込み時に適用
  - [ ] インデックス最終確認（`Episode(podcastId,publishedAt DESC)`、`TranscriptSegment(episodeId,startMs)` ほか）
- P2（中期｜API/検索体験）
  - [ ] `/search` レスポンスにセグメント情報（`segmentId/startMs/endMs/snippet/score/rank`）を追加（互換期間あり）
  - [ ] `@podcast_search/search-core` にフィルタ（`status/version/lang`）、payload index 作成/存在確認、エイリアス運用（`*_v1`/`*_v2`）
  - [ ] `docs/api_spec.md` 作成（API入出力の固定）
  - [ ] ログ/評価（`SearchQueryLog`のみでの最小可視化方針）
- P3（中期〜）
  - [ ] 再埋め込み v2 の実施とエイリアス切替（メトリクス監視込み）
  - [ ] 非公開/削除フローの本実装（RDB 即時 + Qdrant 非同期）
  - [ ] 管理UIの運用機能（再埋め込み・非公開切替・タグ付け）

## リスク/考慮
- 多言語の扱い（単一 vs 言語別コレクション/フィルタ）
- GDPR/削除要件（RDB/Qdrant の完全削除と遅延削除）
- 外部プレイヤーのディープリンク仕様（時間指定形式の統一）
- エピソード重複（ミラー/URL変更/再配信）の正規化戦略
- PII/監査（Discord ID の取り扱い）

## 受け入れ基準（DoD）
- `/search` がセグメント情報を返せる（互換モードあり）
- Qdrant に `status='published'` と `version==current` のフィルタ適用が可能（payload/index 作成済み）
- エイリアス切替で無停止で v2 へ移行できる手順書がある
- `publicId(UUIDv4)` と主要インデックスがスキーマ・実装に反映済み

## ロードマップ（目安）
- M1: P1 完了（設計・データモデルの固定と適用）
- M2: P2 完了（API拡張・search-core改善・API仕様ドキュメント）
- M3: P3 完了（再埋め込み切替・非公開フロー・管理UI）

## 変更履歴
- 2025-..-..: 初版作成
- 2025-..-..: スキーマ拡張反映、タスク/差分を更新
