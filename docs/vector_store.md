# ベクトルストア設計ガイド（Qdrant）

本ドキュメントは Discord からの RAG 検索ユースケースに最適化した Qdrant 設計を示します。

## 現状（実装ベースの前提）
- コレクション: `transcript_segments`
- 埋め込みモデル: OpenAI `text-embedding-3-small`
- ペイロード: `episodeId`（最小限）
- 検索: クエリ埋め込み → 近傍検索 → `episodeId` をユニーク化して RDB から取得

## 推奨設計（運用・可観測性・ガバナンスを考慮）

### コレクションとバージョン
- コレクション名: `transcript_segments_v1`
- エイリアス: `transcript_segments` → 現行世代を指す
- 再埋め込み時は `transcript_segments_v2` を並行作成し、投入完了後にエイリアスを切替

### ベクトル設定
- ベクトル次元: 1536（`text-embedding-3-small`）
- 距離関数: Cosine
- HNSW: `m=16`, `ef_construct=128`, `full_scan_threshold=20000`（目安）
- 量子化: 初期は無効。容量/レイテンシ課題が顕在化したら検討

### ペイロード設計
必須:
- `segmentId`: integer（RDB `TranscriptSegment.id`。pointId もこれを使用推奨）
- `episodeId`: integer（RDB `Episode.id`）
- `podcastId`: integer（RDB `Podcast.id`）
- `start`: float（秒）
- `end`: float（秒）
- `status`: keyword（`published` | `private` | `removed` など）
- `model`: keyword（例: `text-embedding-3-small`）
- `version`: integer（世代管理）
任意（推奨）:
- `lang`: keyword（`ja`/`en` など）
- `snippet`: string（短い抜粋、ハイライト生成用）
- `publicSegmentId`: uuid（外部公開用ID、RDBの `TranscriptSegment.publicId`）
- `publicEpisodeId`: uuid（外部公開用ID、RDBの `Episode.publicId`）

インデックス（payload index）:
- integer: `segmentId`, `episodeId`, `podcastId`, `version`
- keyword: `status`, `lang`, `model`

### 書き込みポリシー
- Upsert 単位: セグメントごと（pointId は `segmentId` をそのまま使用）
- リトライ: ネットワーク/一時エラー時の再送ポリシーを実装
- 整合性監視: RDB の `TranscriptSegment` と Qdrant のポイント件数の差分監視

### 検索ポリシー（フィルタ）
- 必須: `status == 'published'`, `version == current`
- 任意: `lang in [...]`, `podcastId in [...]`
- Top-K: 10（用途に応じて可変）

### 非公開・削除対応
- 非公開化:
  - 直ちに RDB で `Episode.status = 'private'`
  - バックグラウンドで Qdrant のポイントを削除 or `status='private'` にアップサート
- 削除（忘れられる権利など強い要件）:
  - ポイント削除を採用（rewrite ではなく delete）
- 検索側は常に `status='published'` フィルタを適用（RDB 側も二重でガード）

## 設定例

### コレクション作成（REST）
```json
{
  "vectors": { "size": 1536, "distance": "Cosine" },
  "hnsw_config": { "m": 16, "ef_construct": 128, "full_scan_threshold": 20000 },
  "optimizers_config": { "default_segment_number": 2 },
  "replication_factor": 1,
  "write_consistency_factor": 1,
  "on_disk_payload": true
}
```

### ペイロードインデックス作成（例）
```json
{ "field_name": "episodeId", "field_schema": "integer" }
```
```json
{ "field_name": "status", "field_schema": "keyword" }
```
```json
{ "field_name": "version", "field_schema": "integer" }
```

### 検索例（フィルタ付き Top-K）
```json
{
  "vector": [/* 1536-dim */],
  "limit": 10,
  "with_payload": true,
  "filter": {
    "must": [
      { "key": "status", "match": { "value": "published" } },
      { "key": "version", "match": { "value": 1 } }
    ],
    "should": [
      { "key": "lang", "match": { "any": ["ja", "en"] } }
    ]
  }
}
```

### ポイント投入例（Upsert）
```json
{
  "id": "seg_12345",
  "vector": [/* 1536-dim */],
  "payload": {
    "segmentId": 12345,
    "episodeId": 678,
    "podcastId": 9,
    "start": 120.5,
    "end": 140.2,
    "lang": "ja",
    "status": "published",
    "model": "text-embedding-3-small",
    "version": 1,
    "snippet": "この回では…"
  }
}
```

## ロールアウト戦略
- v2 コレクションを作成 → バックフィル → 整合性チェック → エイリアス切替 → v1 廃止
- 低リスク運用が必要な場合は、同一コレクションで `version` を切替フィルタ（ただし肥大化注意）

## メトリクス/監視
- 書き込み成功率、検索レイテンシ（p50/p95）、ヒット率、ポイント総数、payload index サイズ
- RDB と Qdrant の件数/更新遅延の差分
