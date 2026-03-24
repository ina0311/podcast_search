/**
 * Embedding Provider ドメインインターフェース
 *
 * テキストをベクトルに変換する責務を定義します。
 * 実装はインフラストラクチャ層に委譲されます。
 */

export interface EmbeddingProvider {
  /**
   * テキストをベクトルに変換
   * @param text 変換するテキスト
   * @returns ベクトル（数値配列）
   */
  embed(text: string): Promise<number[]>

  /**
   * 複数のテキストを一括でベクトルに変換
   * @param texts 変換するテキストの配列
   * @returns ベクトルの配列
   */
  embedBatch(texts: string[]): Promise<number[][]>

  /**
   * 使用しているモデル名を取得
   */
  getModelName(): string

  /**
   * ベクトルの次元数を取得
   */
  getDimensions(): number
}
