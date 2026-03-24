# データ設計最適化ガイド（200話 × 2時間対応）

## 概要

200話 × 2時間 = 400時間分の文字起こしデータを効率的に検索するためのデータ設計ガイドです。

## 1. セグメント化戦略

### 推奨設定

```typescript
// セグメント設定
const SEGMENT_CONFIG = {
  // セグメント長: 60-90秒（約150-200文字）
  // 理由: 意味のまとまりを保ちつつ、検索精度を高める
  durationSec: 60, // 60秒 = 1分
  
  // オーバーラップ: 10-15秒
  // 理由: 文の途中で切れるのを防ぎ、検索漏れを減らす
  overlapSec: 10,
  
  // 最小セグメント長: 30秒未満は結合
  minDurationSec: 30,
  
  // 最大セグメント長: 120秒を超えたら分割
  maxDurationSec: 120
}
```

### セグメント数の見積もり

- **1エピソード（2時間 = 7,200秒）**
  - セグメント長: 60秒
  - オーバーラップ: 10秒
  - 実効長: 50秒/セグメント
  - **セグメント数: 約144個/エピソード**

- **200話全体**
  - **総セグメント数: 約28,800個**
  - ベクトルサイズ: 28,800 × 1536次元 × 4バイト ≈ **約177MB**
  - Qdrantメモリ: 177MB × 1.5 ≈ **約265MB**（余裕で収まる）

### セグメント化の実装例

```typescript
interface SegmentConfig {
  durationSec: number      // 60秒
  overlapSec: number       // 10秒
  minDurationSec: number   // 30秒
  maxDurationSec: number   // 120秒
}

function createSegments(
  transcript: TranscriptSegment[],
  config: SegmentConfig
): TranscriptSegment[] {
  const segments: TranscriptSegment[] = []
  let currentStart = 0
  
  while (currentStart < transcript.length) {
    const end = Math.min(
      currentStart + config.durationSec,
      transcript.length
    )
    
    // 文の境界で調整（可能な限り）
    const adjustedEnd = adjustToSentenceBoundary(
      transcript,
      end,
      config.maxDurationSec
    )
    
    segments.push({
      startMs: currentStart * 1000,
      endMs: adjustedEnd * 1000,
      text: extractText(transcript, currentStart, adjustedEnd)
    })
    
    // オーバーラップ分を引いて次の開始位置を決定
    currentStart = adjustedEnd - config.overlapSec
  }
  
  return segments
}
```

## 2. データベーススキーマ最適化

### 現在のスキーマ（良好）

```prisma
model TranscriptSegment {
  id           Int            @id @default(autoincrement())
  publicId     String         @unique @default(uuid()) @db.Uuid
  episodeId    Int
  episode      PodcastEpisode @relation(fields: [episodeId], references: [id])
  text         String         @db.Text  // Text型で長文対応
  startMs      Int
  endMs        Int
  language     String?
  speakerLabel String?
  confidence   Float?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@unique([episodeId, startMs, endMs])
  @@index([episodeId, startMs])  // エピソード内検索用
  @@index([episodeId])            // エピソード削除時の一括取得用
}
```

### 追加推奨インデックス

```prisma
model TranscriptSegment {
  // ... 既存フィールド
  
  // 追加インデックス（検索パフォーマンス向上）
  @@index([episodeId, startMs, endMs])  // 範囲検索用（複合）
  @@index([language])                   // 言語フィルタ用（オプション）
}

model PodcastEpisode {
  // ... 既存フィールド
  
  // 追加インデックス
  @@index([podcastId, publishedAt])     // 時系列検索用
  @@index([status, publishedAt])       // 公開状態 + 時系列
}
```

## 3. ベクトルストア（Qdrant）設計

### コレクション設定

```json
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "hnsw_config": {
    "m": 16,                    // 24,000ベクトルなら16で十分
    "ef_construct": 128,        // 構築時の探索範囲
    "full_scan_threshold": 20000  // 24,000なので全件スキャンは発生しない
  },
  "optimizers_config": {
    "default_segment_number": 2,  // 小規模なので2で十分
    "max_optimization_threads": 1
  },
  "replication_factor": 1,
  "write_consistency_factor": 1,
  "on_disk_payload": false      // メモリに全保持（265MBなので可能）
}
```

### ペイロード設計（最適化版）

```typescript
interface QdrantPayload {
  // 必須フィールド（インデックス付き）
  segmentId: number        // TranscriptSegment.id
  episodeId: number       // PodcastEpisode.id
  podcastId: number       // Podcast.id
  start: number           // 秒（float）
  end: number             // 秒（float）
  status: 'published' | 'private' | 'removed'
  version: number         // 埋め込みモデルのバージョン
  
  // 推奨フィールド（検索精度向上）
  lang: 'ja' | 'en' | string
  snippet: string         // セグメントの抜粋（50-100文字）
  
  // メタデータ（オプション）
  model: string           // 'text-embedding-3-small'
  confidence?: number     // Whisperの信頼度
  speakerLabel?: string   // 話者識別
}
```

### ペイロードインデックス

```typescript
// 必須インデックス（検索パフォーマンスに直結）
await qdrant.createPayloadIndex('episodeId', { type: 'integer' })
await qdrant.createPayloadIndex('podcastId', { type: 'integer' })
await qdrant.createPayloadIndex('status', { type: 'keyword' })
await qdrant.createPayloadIndex('version', { type: 'integer' })

// 推奨インデックス（フィルタリング用）
await qdrant.createPayloadIndex('lang', { type: 'keyword' })
```

## 4. 検索フロー最適化

### 検索クエリの最適化

```typescript
async function searchEpisodes(
  query: string,
  options: {
    limit?: number
    podcastId?: number
    lang?: string
  } = {}
): Promise<Episode[]> {
  // 1. クエリをベクトル化
  const queryVector = await embeddingProvider.embed(query)
  
  // 2. Qdrantで検索（フィルタ最適化）
  const filter = {
    must: [
      { key: 'status', match: { value: 'published' } },
      { key: 'version', match: { value: CURRENT_VERSION } }
    ],
    should: [] as any[]
  }
  
  // オプションフィルタ
  if (options.podcastId) {
    filter.must.push({
      key: 'podcastId',
      match: { value: options.podcastId }
    })
  }
  
  if (options.lang) {
    filter.should.push({
      key: 'lang',
      match: { value: options.lang }
    })
  }
  
  // 3. 検索実行（limitは多めに取得してからユニーク化）
  const searchLimit = Math.min((options.limit ?? 10) * 3, 50)
  const hits = await qdrant.search({
    vector: queryVector,
    filter,
    limit: searchLimit,
    with_payload: true
  })
  
  // 4. episodeIdでユニーク化（スコア上位を優先）
  const episodeScores = new Map<number, number>()
  for (const hit of hits) {
    const episodeId = hit.payload.episodeId
    const currentScore = episodeScores.get(episodeId) ?? 0
    episodeScores.set(episodeId, Math.max(currentScore, hit.score))
  }
  
  // 5. スコア順にソート
  const sortedEpisodeIds = Array.from(episodeScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, options.limit ?? 10)
    .map(([id]) => id)
  
  // 6. エピソード情報を取得
  return episodeRepository.findByIds(sortedEpisodeIds)
}
```

## 5. パフォーマンス最適化

### バッチ処理

```typescript
// セグメントの一括埋め込み（推奨）
async function embedSegmentsBatch(
  segments: TranscriptSegment[],
  batchSize: number = 100  // OpenAI APIの制限を考慮
): Promise<void> {
  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize)
    
    // 1. テキストを抽出
    const texts = batch.map(s => s.text)
    
    // 2. 一括でベクトル化（API呼び出しを削減）
    const vectors = await embeddingProvider.embedBatch(texts)
    
    // 3. Qdrantに一括投入
    const points = batch.map((segment, idx) => ({
      id: segment.id,
      vector: vectors[idx],
      payload: {
        segmentId: segment.id,
        episodeId: segment.episodeId,
        podcastId: segment.episode.podcastId,
        start: segment.startMs / 1000,
        end: segment.endMs / 1000,
        status: 'published',
        version: 1,
        lang: segment.language ?? 'ja',
        snippet: segment.text.substring(0, 100)
      }
    }))
    
    await qdrant.upsertBatch(points)
  }
}
```

### キャッシュ戦略

```typescript
// よく検索されるエピソードのキャッシュ
const episodeCache = new Map<number, Episode>()

async function getEpisodeWithCache(id: number): Promise<Episode | null> {
  if (episodeCache.has(id)) {
    return episodeCache.get(id)!
  }
  
  const episode = await episodeRepository.findById(id)
  if (episode) {
    episodeCache.set(id, episode)
  }
  
  return episode
}
```

## 6. データ整合性

### RDBとQdrantの同期

```typescript
// エピソード非公開時の処理
async function hideEpisode(episodeId: number): Promise<void> {
  // 1. RDBで即座に非公開化
  await episodeRepository.update(episodeId, {
    status: 'PRIVATE',
    visibilityChangedAt: new Date()
  })
  
  // 2. Qdrantのセグメントを非公開化（バックグラウンド）
  // オプションA: ステータスを更新（推奨）
  await qdrant.updatePayload(episodeId, {
    status: 'private'
  })
  
  // オプションB: 削除（完全削除が必要な場合）
  // await qdrant.deleteByFilter({
  //   must: [{ key: 'episodeId', match: { value: episodeId } }]
  // })
}

// 整合性チェック（定期実行）
async function checkConsistency(): Promise<{
  missing: number[]
  extra: number[]
}> {
  // RDBのセグメント数
  const rdbSegments = await transcriptRepository.countByEpisode()
  
  // Qdrantのセグメント数
  const qdrantCounts = await qdrant.countByEpisode()
  
  // 差分を検出
  const missing: number[] = []
  const extra: number[] = []
  
  for (const [episodeId, rdbCount] of rdbSegments) {
    const qdrantCount = qdrantCounts.get(episodeId) ?? 0
    if (rdbCount > qdrantCount) {
      missing.push(episodeId)
    } else if (rdbCount < qdrantCount) {
      extra.push(episodeId)
    }
  }
  
  return { missing, extra }
}
```

## 7. 監視とメトリクス

### 推奨メトリクス

```typescript
interface Metrics {
  // 検索パフォーマンス
  searchLatency: {
    p50: number  // 目標: < 100ms
    p95: number  // 目標: < 200ms
    p99: number  // 目標: < 500ms
  }
  
  // データ整合性
  consistency: {
    rdbSegmentCount: number
    qdrantPointCount: number
    diff: number
  }
  
  // リソース使用量
  resources: {
    qdrantMemoryMB: number
    qdrantDiskMB: number
    embeddingApiCalls: number
  }
}
```

## 8. スケーラビリティ考慮

### 将来の拡張（1000話以上の場合）

1. **セグメントの量子化**
   - メモリ使用量を1/4に削減
   - 検索精度は若干低下（許容範囲）

2. **コレクション分割**
   - ポッドキャストごとにコレクションを分割
   - 検索時に複数コレクションを並列検索

3. **メモリマップドストレージ**
   - `on_disk_payload: true` に変更
   - メモリ使用量を削減（検索レイテンシは若干増加）

## まとめ

### 推奨設定（200話 × 2時間）

| 項目 | 設定値 | 理由 |
|------|--------|------|
| セグメント長 | 60秒 | 意味のまとまりを保つ |
| オーバーラップ | 10秒 | 検索漏れを防ぐ |
| 総セグメント数 | 約28,800個 | 管理可能な規模 |
| Qdrantメモリ | 約265MB | メモリ内で高速検索可能 |
| 検索レイテンシ | < 100ms | 十分な性能 |

### 実装優先度

1. **高優先度（必須）**
   - セグメント化の実装（60秒、10秒オーバーラップ）
   - ペイロードインデックスの作成
   - 検索クエリの最適化

2. **中優先度（推奨）**
   - バッチ処理の実装
   - 整合性チェック機能
   - メトリクス収集

3. **低優先度（将来）**
   - キャッシュ戦略
   - 量子化
   - コレクション分割
