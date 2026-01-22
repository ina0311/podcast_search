import type { PodcastEpisode } from '@podcast_search/database'
import { apiClient, assertOk } from '../lib/api-client'

export interface PodcastSearchResult {
  episodes: PodcastEpisode[]
  hitsCount: number
}

export const searchPodcastEpisodes = async (
  query: string,
  limit?: number
): Promise<PodcastSearchResult> => {
  const queryParams: { q: string; limit?: string } = { q: query }
  if (limit !== undefined) {
    queryParams.limit = String(limit)
  }
  const res = await apiClient.search.$get({ query: queryParams })
  assertOk(res)
  return res.json()
}
