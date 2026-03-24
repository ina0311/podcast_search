# 2,300話規模へのスケーリング設計ガイド

## 概要

複数番組で2,300話（約11.5倍）を管理する場合のデータ設計と最適化戦略です。

## スケール計算

### データサイズ見積もり

| 項目 | 200話 | 2,300話 | 増加率 |
|------|-------|---------|--------|
| **総エピソード数** | 200 | 2,300 | 11.5倍 |
| **総セグメント数** | 28,800 | 331,200 | 11.5倍 |
| **テキストデータ（PostgreSQL）** | 10-15MB | 115-173MB | 11.5倍 |
| **ベクトルデータ（Qdrant）** | 177MB | 2.0GB | 11.5倍 |
| **Qdrantメモリ使用量** | 265MB | 3.0GB | 11.5倍 |

### 結論：現状の設計で対応可能

- **PostgreSQL**: 115-173MBは余裕で対応可能
- **Qdrant**: 3GBはメモリマップドストレージで対応可能
- **検索性能**: 若干の劣化の可能性（最適化で対応可能）

---

## 1. PostgreSQL設計の最適化

### 追加推奨インデックス

```prisma
model TranscriptSegment {
  // ... 既存フィールド
  
  // 既存インデックス
  @@unique([episodeId, startMs, endMs])
  @@index([episodeId, startMs])
  
  // 追加推奨インデックス（2,300話規模）
  @@index([episodeId])                    // エピソード削除時の一括取得用
  @@index([episodeId, startMs, endMs])   // 範囲検索用（複合）
  @@index([language])                     // 言語フィルタ用（オプション）
}

model PodcastEpisode {
  // ... 既存フィールド
  
  // 追加推奨インデックス
  @@index([podcastId, publishedAt])      // 時系列検索用
  @@index([status, publishedAt])        // 公開状態 + 時系列
  @@index([podcastId, status])           // ポッドキャスト + 状態フィルタ
}
```

### パーティショニング（オプション）

2,300話を超える場合は、テーブルパーティショニングを検討：

```sql
-- ポッドキャストIDでパーティショニング（将来の拡張）
CREATE TABLE "TranscriptSegment" (
  -- ... カラム定義
) PARTITION BY HASH ("podcastId");

-- パーティション作成（例：10個のパーティション）
CREATE TABLE "TranscriptSegment_0" PARTITION OF "TranscriptSegment"
  FOR VALUES WITH (MODULUS 10, REMAINDER 0);
-- ... 他のパーティション
```

**注意**: 現時点では不要（2,300話なら通常のインデックスで十分）

---

## 2. Qdrant設計の最適化

### コレクション設定（2,300話対応）

```json
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  },
  "hnsw_config": {
    "m": 16,                    // 331,200ベクトルでも16で十分
    "ef_construct": 200,        // 構築時の探索範囲を増やす（128→200）
    "full_scan_threshold": 100000  // 全件スキャンの閾値を上げる
  },
  "optimizers_config": {
    "default_segment_number": 4,  // セグメント数を増やす（2→4）
    "max_optimization_threads": 2, // 最適化スレッドを増やす
    "memmap_threshold": 20000     // メモリマップドストレージの閾値
  },
  "replication_factor": 1,
  "write_consistency_factor": 1,
  "on_disk_payload": true        // メモリ使用量削減のため有効化
}
```

### メモリマップドストレージの活用

3GBのメモリ使用量を削減するため、`on_disk_payload: true`を推奨：

```typescript
// メリット
// - メモリ使用量を約1/3に削減（3GB → 1GB）
// - 検索レイテンシは若干増加（100ms → 150ms程度）

// デメリット
// - 検索レイテンシが若干増加
// - ディスクI/Oが増加（SSD推奨）
```

### 量子化の検討（オプション）

メモリ使用量をさらに削減する場合：

```json
{
  "quantization_config": {
    "scalar": {
      "type": "int8",
      "quantile": 0.99,
      "always_ram": true
    }
  }
}
```

- **メモリ削減**: 3GB → 約750MB（1/4に削減）
- **検索精度**: 若干低下（許容範囲）
- **検索レイテンシ**: ほぼ変わらない

---

## 3. 検索パフォーマンス最適化

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
    ]
  }
  
  // ポッドキャストフィルタ（インデックス活用）
  if (options.podcastId) {
    filter.must.push({
      key: 'podcastId',
      match: { value: options.podcastId }
    })
  }
  
  // 3. 検索実行（limitは多めに取得）
  // 2,300話規模では、より多くの候補を取得してからユニーク化
  const searchLimit = Math.min((options.limit ?? 10) * 5, 100)
  const hits = await qdrant.search({
    vector: queryVector,
    filter,
    limit: searchLimit,
    with_payload: true,
    score_threshold: 0.7  // スコア閾値を設定（ノイズを減らす）
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
  
  // 6. エピソード情報を取得（バッチ処理）
  return episodeRepository.findByIds(sortedEpisodeIds)
}
```

### キャッシュ戦略

```typescript
// よく検索されるエピソードのキャッシュ
const episodeCache = new LRUCache<number, Episode>({
  max: 1000,  // 2,300話の約43%をキャッシュ
  ttl: 1000 * 60 * 60  // 1時間
})

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

---

## 4. コレクション分割戦略（将来の拡張）

### ポッドキャストごとのコレクション分割

2,300話を超え、複数番組を管理する場合：

```typescript
// コレクション名: transcript_segments_podcast_{podcastId}
const collectionName = `transcript_segments_podcast_${podcastId}`

// 検索時は複数コレクションを並列検索
async function searchAcrossPodcasts(
  query: string,
  podcastIds: number[],
  limit: number = 10
): Promise<Episode[]> {
  const queryVector = await embeddingProvider.embed(query)
  
  // 並列検索
  const searchPromises = podcastIds.map(podcastId =>
    qdrant.search({
      collectionName: `transcript_segments_podcast_${podcastId}`,
      vector: queryVector,
      filter: {
        must: [
          { key: 'status', match: { value: 'published' } },
          { key: 'version', match: { value: CURRENT_VERSION } }
        ]
      },
      limit: limit * 2  // 各コレクションから多めに取得
    })
  )
  
  const results = await Promise.all(searchPromises)
  
  // 結果をマージしてソート
  const allHits = results.flat()
  const episodeScores = new Map<number, number>()
  
  for (const hit of allHits) {
    const episodeId = hit.payload.episodeId
    const currentScore = episodeScores.get(episodeId) ?? 0
    episodeScores.set(episodeId, Math.max(currentScore, hit.score))
  }
  
  const sortedEpisodeIds = Array.from(episodeScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)
  
  return episodeRepository.findByIds(sortedEpisodeIds)
}
```

### メリット・デメリット

**メリット**:
- コレクションサイズの削減（検索性能向上）
- ポッドキャスト単位での管理が容易
- 個別の最適化が可能

**デメリット**:
- 実装の複雑さが増加
- 複数コレクションの管理が必要
- 検索時の並列処理が必要

**結論**: 2,300話規模では**まだ不要**。5,000話以上になったら検討。

---

## 5. データ整合性の強化

### バッチ処理の最適化

```typescript
// 大量データの一括投入
async function embedSegmentsBatch(
  segments: TranscriptSegment[],
  batchSize: number = 50  // 2,300話規模では50に削減（API制限考慮）
): Promise<void> {
  for (let i = 0; i < segments.length; i += batchSize) {
    const batch = segments.slice(i, i + batchSize)
    
    try {
      // 1. テキストを抽出
      const texts = batch.map(s => s.text)
      
      // 2. 一括でベクトル化
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
    } catch (error) {
      // エラーログとリトライ
      console.error(`Batch ${i}-${i + batchSize} failed:`, error)
      // リトライロジック
    }
  }
}
```

### 整合性チェックの定期実行

```typescript
// 定期実行（cron等で1日1回）
async function checkConsistency(): Promise<{
  missing: number[]
  extra: number[]
  stats: {
    rdbCount: number
    qdrantCount: number
    diff: number
  }
}> {
  // RDBのセグメント数（エピソードごと）
  const rdbSegments = await prisma.transcriptSegment.groupBy({
    by: ['episodeId'],
    _count: { id: true }
  })
  
  // Qdrantのセグメント数（エピソードごと）
  const qdrantCounts = new Map<number, number>()
  // Qdrantから集計（実装が必要）
  
  const missing: number[] = []
  const extra: number[] = []
  
  for (const { episodeId, _count } of rdbSegments) {
    const rdbCount = _count.id
    const qdrantCount = qdrantCounts.get(episodeId) ?? 0
    
    if (rdbCount > qdrantCount) {
      missing.push(episodeId)
    } else if (rdbCount < qdrantCount) {
      extra.push(episodeId)
    }
  }
  
  const totalRdb = rdbSegments.reduce((sum, s) => sum + s._count.id, 0)
  const totalQdrant = Array.from(qdrantCounts.values()).reduce((a, b) => a + b, 0)
  
  return {
    missing,
    extra,
    stats: {
      rdbCount: totalRdb,
      qdrantCount: totalQdrant,
      diff: totalRdb - totalQdrant
    }
  }
}
```

---

## 6. 監視とメトリクス

### 推奨メトリクス（2,300話規模）

```typescript
interface Metrics {
  // 検索パフォーマンス
  searchLatency: {
    p50: number  // 目標: < 150ms
    p95: number  // 目標: < 300ms
    p99: number  // 目標: < 500ms
  }
  
  // データ整合性
  consistency: {
    rdbSegmentCount: number
    qdrantPointCount: number
    diff: number
    missingEpisodes: number[]
  }
  
  // リソース使用量
  resources: {
    qdrantMemoryMB: number      // 目標: < 3GB
    qdrantDiskMB: number        // 目標: < 5GB
    postgresSizeMB: number      // 目標: < 200MB
    embeddingApiCalls: number  // 監視（コスト管理）
  }
  
  // 検索品質
  searchQuality: {
    avgScore: number           // 平均スコア
    hitRate: number            // ヒット率
    uniqueEpisodesPerQuery: number  // クエリあたりのユニークエピソード数
  }
}
```

---

## 7. 段階的な最適化戦略

### Phase 1: 現状維持（200話）

- PostgreSQL: 通常のインデックス
- Qdrant: メモリ内検索（`on_disk_payload: false`）
- 検索レイテンシ: < 100ms

### Phase 2: 1,000話規模

- PostgreSQL: 追加インデックス
- Qdrant: メモリマップドストレージ検討（`on_disk_payload: true`）
- 検索レイテンシ: < 150ms

### Phase 3: 2,300話規模（現在の目標）

- PostgreSQL: 追加インデックス + パーティショニング検討
- Qdrant: メモリマップドストレージ + 量子化検討
- 検索レイテンシ: < 200ms
- キャッシュ戦略の導入

### Phase 4: 5,000話以上

- コレクション分割の検討
- より積極的な最適化
- 水平スケーリングの検討

---

## まとめ：2,300話規模での推奨設計

### 必須の最適化

1. **PostgreSQL**
   - 追加インデックスの作成
   - パーティショニングは不要（現時点）

2. **Qdrant**
   - `on_disk_payload: true` に変更（メモリ削減）
   - HNSW設定の調整（`ef_construct: 200`）
   - 量子化の検討（オプション）

3. **検索クエリ**
   - `score_threshold` の設定
   - 検索limitの調整（`limit × 5`）
   - キャッシュ戦略の導入

### オプションの最適化

1. **コレクション分割**: 5,000話以上になったら検討
2. **量子化**: メモリが不足したら検討
3. **パーティショニング**: 10,000話以上になったら検討

### パフォーマンス目標

| 項目 | 目標値 |
|------|--------|
| 検索レイテンシ（p95） | < 300ms |
| Qdrantメモリ使用量 | < 3GB |
| PostgreSQLサイズ | < 200MB |
| データ整合性エラー | 0件 |

---

## 結論

**2,300話規模でも、現状の設計（PostgreSQL + Qdrant）で対応可能です。**

必要な最適化：
- ✅ Qdrantのメモリマップドストレージ有効化
- ✅ 追加インデックスの作成
- ✅ 検索クエリの最適化
- ✅ キャッシュ戦略の導入

**5,000話以上になったら、コレクション分割などのより積極的な最適化を検討してください。**
