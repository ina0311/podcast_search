# 書き起こしテキストの保存先比較：PostgreSQL vs NoSQL

## 概要

200話 × 2時間の文字起こしデータ（約28,800セグメント）を保存する際の、PostgreSQLとNoSQLの比較です。

## データサイズ見積もり

- **総セグメント数**: 約28,800個
- **1セグメントあたりのテキスト**: 平均150-200文字（60秒分）
- **総テキスト量**: 約4.3-5.8MB（圧縮なし）
- **PostgreSQLでの保存サイズ**: 約10-15MB（インデックス含む）

## 比較表

| 観点 | PostgreSQL（現状） | MongoDB | DynamoDB | 結論 |
|------|-------------------|---------|----------|------|
| **リレーション管理** | ⭐⭐⭐⭐⭐ JOINが容易 | ⭐⭐⭐ 埋め込み/参照 | ⭐⭐ 単一テーブル | PostgreSQL優位 |
| **トランザクション** | ⭐⭐⭐⭐⭐ ACID保証 | ⭐⭐⭐⭐ マルチドキュメント | ⭐⭐ 単一アイテム | PostgreSQL優位 |
| **既存実装との統合** | ⭐⭐⭐⭐⭐ Prisma統合済み | ⭐⭐ 別ORM必要 | ⭐⭐ 別SDK必要 | PostgreSQL優位 |
| **検索性能** | ⭐⭐⭐⭐ インデックス優秀 | ⭐⭐⭐⭐ インデックス可能 | ⭐⭐⭐ キー検索中心 | 同等 |
| **スケーラビリティ** | ⭐⭐⭐ 垂直スケール | ⭐⭐⭐⭐⭐ 水平スケール | ⭐⭐⭐⭐⭐ 自動スケール | NoSQL優位（大規模時） |
| **コスト** | ⭐⭐⭐⭐⭐ 既存DBで無料 | ⭐⭐⭐ 追加コスト | ⭐⭐ 従量課金 | PostgreSQL優位 |
| **実装の複雑さ** | ⭐⭐⭐⭐⭐ シンプル | ⭐⭐⭐ 中程度 | ⭐⭐ 複雑 | PostgreSQL優位 |
| **全文検索** | ⭐⭐⭐⭐⭐ tsvector対応 | ⭐⭐⭐ テキストインデックス | ⭐⭐ 限定的 | PostgreSQL優位 |

## 詳細比較

### 1. リレーション管理

#### PostgreSQL（現状）
```typescript
// EpisodeとTranscriptSegmentのJOINが簡単
const episode = await prisma.podcastEpisode.findUnique({
  where: { id: episodeId },
  include: { transcripts: true }  // ← 簡単にリレーション取得
})
```

#### MongoDB
```typescript
// 埋め込み方式（非正規化）
const episode = await mongo.episodes.findOne({ _id: episodeId })
// transcriptsが配列として埋め込まれている

// 参照方式（正規化）
const episode = await mongo.episodes.findOne({ _id: episodeId })
const transcripts = await mongo.transcripts.find({ episodeId })
// ← 2回のクエリが必要
```

#### DynamoDB
```typescript
// 単一テーブル設計が必要
// パーティションキー: episodeId
// ソートキー: startMs
const transcripts = await dynamo.query({
  TableName: 'transcripts',
  KeyConditionExpression: 'episodeId = :id',
  ExpressionAttributeValues: { ':id': episodeId }
})
// ← JOINができない、設計が複雑
```

**結論**: PostgreSQLが最もシンプルで強力

---

### 2. アクセスパターン

#### 主なクエリパターン

1. **IDで取得**（検索結果から）
   ```typescript
   // PostgreSQL
   await prisma.transcriptSegment.findUnique({ where: { id } })
   
   // MongoDB
   await mongo.transcripts.findOne({ _id: id })
   
   // DynamoDB
   await dynamo.getItem({ TableName: 'transcripts', Key: { id } })
   ```
   → **同等の性能**

2. **エピソードIDで範囲取得**
   ```typescript
   // PostgreSQL
   await prisma.transcriptSegment.findMany({
     where: { episodeId },
     orderBy: { startMs: 'asc' }
   })
   
   // MongoDB
   await mongo.transcripts.find({ episodeId }).sort({ startMs: 1 })
   
   // DynamoDB
   await dynamo.query({
     KeyConditionExpression: 'episodeId = :id',
     ExpressionAttributeValues: { ':id': episodeId }
   })
   ```
   → **同等の性能**（インデックスがあれば）

3. **エピソードと一緒に取得**（JOIN）
   ```typescript
   // PostgreSQL
   await prisma.podcastEpisode.findUnique({
     where: { id },
     include: { transcripts: true }
   })
   
   // MongoDB
   // 埋め込み方式なら1回、参照方式なら2回
   
   // DynamoDB
   // 2回のクエリが必要
   ```
   → **PostgreSQLが優位**

---

### 3. データ整合性

#### トランザクションが必要な場面

```typescript
// エピソード削除時
await prisma.$transaction([
  prisma.transcriptSegment.deleteMany({ where: { episodeId } }),
  prisma.podcastEpisode.delete({ where: { id } })
])
```

- **PostgreSQL**: ACIDトランザクションで整合性保証
- **MongoDB**: マルチドキュメントトランザクション可能（v4.0+）
- **DynamoDB**: 単一アイテムのみ、複数テーブルは不可

**結論**: PostgreSQLが最も安全

---

### 4. コスト比較

#### PostgreSQL（現状）
- **コスト**: $0（既存のSupabase/PostgreSQLで運用）
- **追加インフラ**: 不要

#### MongoDB Atlas
- **無料枠**: 512MB（28,800セグメントならギリギリ）
- **有料**: $9/月〜（M0クラスタ）
- **追加コスト**: 月額$9-50

#### DynamoDB
- **無料枠**: 25GB（十分）
- **従量課金**: 読み取り $0.25/100万ユニット、書き込み $1.25/100万ユニット
- **見積もり**: 月額$1-5（低トラフィック時）

**結論**: PostgreSQLが最もコスト効率が良い

---

### 5. 実装の複雑さ

#### PostgreSQL（現状）
```typescript
// Prismaで型安全にアクセス
const segment = await prisma.transcriptSegment.findUnique({
  where: { id }
})
// ← 既に実装済み、型推論も効く
```

#### MongoDB
```typescript
// Mongooseまたはネイティブドライバー
import { MongoClient } from 'mongodb'
const client = new MongoClient(uri)
const db = client.db('podcast')
const segments = db.collection('transcripts')

// Prismaの代わりに別ORMが必要
// 型安全性は自分で管理
```

#### DynamoDB
```typescript
// AWS SDK
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const result = await client.send(new GetCommand({
  TableName: 'transcripts',
  Key: { id }
}))
// ← 型安全性なし、エラーハンドリングが複雑
```

**結論**: PostgreSQLが最もシンプル

---

### 6. 将来の拡張性

#### 全文検索（ハイブリッド検索）

```sql
-- PostgreSQL: tsvectorで全文検索可能
ALTER TABLE "TranscriptSegment" 
ADD COLUMN "textVector" tsvector 
GENERATED ALWAYS AS (to_tsvector('japanese', text)) STORED;

CREATE INDEX "TranscriptSegment_textVector_idx" 
ON "TranscriptSegment" USING GIN("textVector");

-- ベクトル検索 + 全文検索のハイブリッド
SELECT * FROM "TranscriptSegment"
WHERE "textVector" @@ to_tsquery('japanese', 'UMA & 起源')
ORDER BY ts_rank("textVector", to_tsquery('japanese', 'UMA & 起源')) DESC;
```

- **PostgreSQL**: `tsvector`で強力な全文検索
- **MongoDB**: テキストインデックス可能だが機能が限定的
- **DynamoDB**: 全文検索機能なし

**結論**: PostgreSQLが将来の拡張性に優れる

---

## 結論：PostgreSQLが最適な理由

### ✅ PostgreSQLを選ぶべき理由

1. **既存実装との統合**
   - Prismaで既に実装済み
   - 型安全性が確保されている
   - 追加の実装が不要

2. **リレーション管理**
   - EpisodeとのJOINが簡単
   - トランザクションで整合性保証

3. **コスト効率**
   - 追加のインフラ不要
   - 既存のSupabase/PostgreSQLで運用可能

4. **将来の拡張性**
   - `tsvector`で全文検索可能
   - ハイブリッド検索（ベクトル + 全文）に対応

5. **この規模では十分**
   - 28,800セグメント = 約10-15MB
   - PostgreSQLで十分な性能

### ❌ NoSQLを選ぶべきでない理由

1. **実装の複雑さ**
   - Prismaから別ORMへの移行が必要
   - 型安全性の確保が困難

2. **リレーション管理**
   - JOINができない（または複雑）
   - データ整合性の管理が困難

3. **追加コスト**
   - MongoDB Atlas: $9/月〜
   - DynamoDB: 従量課金

4. **過剰な最適化**
   - 200話程度ならNoSQLのメリットが活かせない
   - YAGNI原則に反する

---

## 例外：NoSQLを検討すべきケース

以下の条件が揃った場合のみ、NoSQLへの移行を検討：

1. **大規模化**
   - 10,000話以上（約144万セグメント）
   - テラバイト級のデータ

2. **高トラフィック**
   - 1日10万リクエスト以上
   - 読み取り性能がボトルネック

3. **地理的分散**
   - マルチリージョン展開
   - 低レイテンシ要件

4. **スキーマの柔軟性**
   - 頻繁なスキーマ変更
   - 異なる構造のデータを保存

---

## 推奨：現状維持（PostgreSQL）

**結論**: 書き起こしテキストは**PostgreSQLに保存**するのが最適です。

理由：
- ✅ 既存実装との統合が容易
- ✅ リレーション管理がシンプル
- ✅ コスト効率が高い
- ✅ 将来の拡張性（全文検索）に対応可能
- ✅ この規模では十分な性能

NoSQLへの移行は、上記の例外ケースに該当する場合のみ検討してください。
