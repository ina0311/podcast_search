import { apiClient, assertOk } from '../lib/api-client'

export const fetchEpisodes = async () => {
  const res = await apiClient.episodes.$get()
  assertOk(res)
  return res.json()
}

export const fetchEpisode = async (id: number) => {
  const res = await apiClient.episodes[':id'].$get({ param: { id: String(id) } })
  assertOk(res)
  return res.json()
}
