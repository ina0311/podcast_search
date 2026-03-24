/**
 * Vector Store ドメインインターフェース
 *
 * ベクトルの保存・検索・削除の責務を定義します。
 * 実装はインフラストラクチャ層に委譲されます。
 */

export interface VectorSearchPayload {
  /** TranscriptSegment の内部 ID */
  segmentId: number
  /** PodcastEpisode の内部 ID */
  episodeId: number
  /** Podcast の内部 ID */
  podcastId: number
  /** セグメント開始時刻（ミリ秒） */
  startMs: number
  /** セグメント終了時刻（ミリ秒） */
  endMs: number
  /** 公開状態（'published' | 'private' など） */
  status: string
  /** 言語コード（例: 'ja', 'en'） */
  lang: string
  /** 追加メタデータ */
  [key: string]: unknown
}

export interface VectorSearchResult {
  id: string
  score: number
  payload?: Partial<VectorSearchPayload> & Record<string, unknown>
}

export interface VectorSearchOptions {
  /** 検索結果の最大件数 */
  limit?: number
  /** フィルタ条件（実装依存） */
  filter?: VectorSearchFilter
  /** スコアの閾値（実装依存） */
  scoreThreshold?: number
}

export interface VectorSearchFilter {
  /** 必須条件（AND） */
  must?: FilterCondition[]
  /** 任意条件（OR） */
  should?: FilterCondition[]
  /** 除外条件（NOT） */
  mustNot?: FilterCondition[]
}

export interface FilterCondition {
  key: string
  match?: {
    value?: unknown
    any?: unknown[]
    all?: unknown[]
  }
  range?: {
    gte?: number
    lte?: number
    gt?: number
    lt?: number
  }
}

export interface VectorStore {
  /**
   * ベクトルを保存または更新
   * @param id 一意のID
   * @param vector ベクトル
   * @param payload メタデータ
   */
  upsert(id: string, vector: number[], payload?: Record<string, unknown>): Promise<void>

  /**
   * 複数のベクトルを一括で保存または更新
   * @param points ポイントの配列
   */
  upsertBatch(
    points: Array<{ id: string; vector: number[]; payload?: Record<string, unknown> }>
  ): Promise<void>

  /**
   * ベクトル検索を実行
   * @param vector クエリベクトル
   * @param options 検索オプション
   * @returns 検索結果の配列
   */
  search(vector: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>

  /**
   * 指定したIDのベクトルを削除
   * @param id 削除するID
   */
  delete(id: string): Promise<void>

  /**
   * 複数のIDのベクトルを一括削除
   * @param ids 削除するIDの配列
   */
  deleteBatch(ids: string[]): Promise<void>

  /**
   * コレクション/インデックスが存在するか確認
   */
  collectionExists(): Promise<boolean>

  /**
   * コレクション/インデックスを作成
   * @param config 設定（実装依存）
   */
  createCollection(config?: unknown): Promise<void>
}
