import { apiClient, assertOk } from '../lib/api-client'

export const fetchPodcasts = async () => {
  const res = await apiClient.podcasts.$get()
  assertOk(res)
  return res.json()
}

export const fetchPodcast = async (id: number) => {
  const res = await apiClient.podcasts[':id'].$get({ param: { id: String(id) } })
  assertOk(res)
  return res.json()
}
