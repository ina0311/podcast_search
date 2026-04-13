import { XMLParser } from 'fast-xml-parser'

export interface RssEpisode {
  title: string
  enclosureUrl: string
  audioUrl: string
  publishedAt: Date | null
  durationSec: number | null
  description: string | null
}

function extractAudioUrl(enclosureUrl: string): string {
  // https://anchor.fm/s/xxx/podcast/play/{id}/{URL_encoded_cloudfront_url}
  const parts = enclosureUrl.split('/')
  const lastSegment = parts[parts.length - 1]
  try {
    const decoded = decodeURIComponent(lastSegment)
    if (decoded.startsWith('http')) return decoded
  } catch {}
  return enclosureUrl
}

function parseDurationSec(value: unknown): number | null {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return null
  const parts = value.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return Number(value) || null
}

export async function fetchRssEpisodes(rssUrl: string): Promise<RssEpisode[]> {
  const res = await fetch(rssUrl)
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
  const xml = await res.text()

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const parsed = parser.parse(xml)
  const items: unknown[] = parsed?.rss?.channel?.item ?? []
  const itemArray = Array.isArray(items) ? items : [items]

  return itemArray
    .filter((item: any) => item?.enclosure?.['@_url'])
    .map((item: any) => {
      const enclosureUrl = String(item.enclosure['@_url'])
      return {
        title: String(item.title ?? ''),
        enclosureUrl,
        audioUrl: extractAudioUrl(enclosureUrl),
        publishedAt: item.pubDate ? new Date(item.pubDate as string) : null,
        durationSec: parseDurationSec(item['itunes:duration']),
        description: item.description ? String(item.description) : null
      }
    })
}
