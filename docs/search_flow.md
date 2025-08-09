# 検索フロー

## 1. Embedding 生成

- OpenAI `text-embedding-3-small` を利用  
- `TranscriptSegment` 単位でベクトル化  
- 生成されたベクトルは Qdrant の `transcript_segments` コレクションに保存されます。

## 2. Qdrant 近傍検索

```ts
const results = await qdrant.search({
  collectionName: "transcript_segments",
  vector,
  filter: {
    must: [
      // 例: 特定 PodcastEpisode のみ検索
      { key: "episodeId", match: { any: [episodeId] } },
    ],
  },
  limit: 10,
});
```

## 3. スコアリング & 再ランキング

現状はコサイン類似度のみでソートしています。将来的には BM25 などの全文検索スコアを組み合わせたハイブリッド検索を検討しています。
