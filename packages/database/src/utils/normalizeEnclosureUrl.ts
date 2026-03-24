/**
 * enclosureUrl 正規化ユーティリティ
 *
 * RSS フィードから取得した音声 URL には、追跡用クエリパラメータや
 * リダイレクト URL が付与されていることがある。
 * 重複取り込みを防ぐため、一意性判定に使う前に正規化する。
 *
 * 対応する正規化:
 * - スキームを https に統一（http -> https）
 * - 既知の追跡クエリパラメータを除去
 * - フラグメント (#...) を除去
 * - パスの末尾スラッシュを除去
 *
 * 非対応（要件確定後に追加）:
 * - 署名付き一時 URL の正規化
 * - HLS (.m3u8) の扱い
 * - 多段リダイレクトの解決
 */

/** 除去する追跡クエリパラメータのリスト（大文字小文字を区別しない） */
const TRACKING_PARAMS = new Set([
  // 汎用トラッキング
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  // ポッドキャスト配信プラットフォーム系
  'source',
  '_from',
  'ref',
  'referrer',
  // Spotify / Anchor
  'utm_brand',
  'utm_placement',
  // その他
  'at',
  'ct',
  'ign-mpt',
  'ign-itscg'
])

/**
 * enclosureUrl を正規化する
 *
 * @param rawUrl RSS などから取得した生の URL 文字列
 * @returns 正規化済みの URL 文字列。パースに失敗した場合は元の文字列を返す
 */
export function normalizeEnclosureUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    // 無効な URL はそのまま返す（バリデーションは呼び出し側で行う）
    return rawUrl
  }

  // http -> https に統一
  if (url.protocol === 'http:') {
    url.protocol = 'https:'
  }

  // フラグメントを除去
  url.hash = ''

  // 既知の追跡クエリパラメータを除去
  const keysToDelete: string[] = []
  for (const key of url.searchParams.keys()) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      keysToDelete.push(key)
    }
  }
  for (const key of keysToDelete) {
    url.searchParams.delete(key)
  }

  // パスの末尾スラッシュを除去（ルートパス "/" は除く）
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }

  return url.toString()
}
