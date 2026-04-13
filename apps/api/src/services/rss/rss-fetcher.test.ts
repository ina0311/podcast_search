const mockFetch = jest.spyOn(global, 'fetch')

describe('fetchRssEpisodes', () => {
  beforeEach(() => jest.clearAllMocks())

  it('enclosure URLをデコードしてaudioUrlを返す', async () => {
    const encodedUrl = 'https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-3-7%2Fabc.mp3'
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Episode 1</title>
      <pubDate>Mon, 07 Apr 2026 05:00:00 GMT</pubDate>
      <enclosure url="https://anchor.fm/s/xxx/podcast/play/123/${encodedUrl}" length="0" type="audio/mpeg"/>
      <itunes:duration>3600</itunes:duration>
      <description>説明</description>
    </item>
  </channel>
</rss>`
    mockFetch.mockResolvedValueOnce(new Response(xml, { status: 200 }) as any)

    const { fetchRssEpisodes } = await import('./rss-fetcher')
    const episodes = await fetchRssEpisodes('https://example.com/rss')

    expect(episodes).toHaveLength(1)
    expect(episodes[0].audioUrl).toBe(
      'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-3-7/abc.mp3'
    )
    expect(episodes[0].title).toBe('Episode 1')
    expect(episodes[0].durationSec).toBe(3600)
  })

  it('fetchが失敗するとエラーをスロー', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 404 }) as any)

    const { fetchRssEpisodes } = await import('./rss-fetcher')
    await expect(fetchRssEpisodes('https://example.com/rss')).rejects.toThrow('RSS fetch failed')
  })

  it('enclosureがないitemはスキップする', async () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item><title>No Audio</title></item>
  </channel>
</rss>`
    mockFetch.mockResolvedValueOnce(new Response(xml, { status: 200 }) as any)

    const { fetchRssEpisodes } = await import('./rss-fetcher')
    const episodes = await fetchRssEpisodes('https://example.com/rss')

    expect(episodes).toHaveLength(0)
  })
})
