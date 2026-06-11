const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY ?? ''

const headers = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': adminApiKey
})

export interface Personality {
  id: number
  publicId: string
  name: string
  description: string | null
  audioSamples: { id: number; publicId: string; storageUrl: string }[]
  role?: string | null
}

export const fetchPersonalities = async (): Promise<Personality[]> => {
  const res = await fetch(`${apiBaseUrl}/personalities`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch personalities')
  return res.json()
}

export const fetchPersonality = async (publicId: string): Promise<Personality> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}`, { headers: headers() })
  if (!res.ok) throw new Error('Failed to fetch personality')
  return res.json()
}

export const createPersonality = async (data: {
  name: string
  description?: string
}): Promise<Personality> => {
  const res = await fetch(`${apiBaseUrl}/personalities`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create personality')
  return res.json()
}

export const updatePersonality = async (
  publicId: string,
  data: { name?: string; description?: string }
): Promise<Personality> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update personality')
  return res.json()
}

export const deletePersonality = async (publicId: string): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to delete personality')
}

export const uploadAudioSample = async (publicId: string, file: File): Promise<void> => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${apiBaseUrl}/personalities/${publicId}/samples`, {
    method: 'POST',
    headers: { 'X-Admin-Key': adminApiKey },
    body: formData
  })
  if (!res.ok) throw new Error('Failed to upload sample')
}

export const deleteAudioSample = async (
  personalityPublicId: string,
  sampleId: number
): Promise<void> => {
  const res = await fetch(
    `${apiBaseUrl}/personalities/${personalityPublicId}/samples/${sampleId}`,
    {
      method: 'DELETE',
      headers: headers()
    }
  )
  if (!res.ok) throw new Error('Failed to delete sample')
}

export const addPersonalityToPodcast = async (
  podcastId: number,
  personalityId: number,
  role?: string
): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-podcast/${podcastId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ personalityId, role })
  })
  if (!res.ok) throw new Error('Failed to add personality to podcast')
}

export const removePersonalityFromPodcast = async (
  podcastId: number,
  personalityId: number
): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-podcast/${podcastId}/${personalityId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to remove personality from podcast')
}

export const addPersonalityToEpisode = async (
  episodeId: number,
  personalityId: number,
  role?: string
): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-episode/${episodeId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ personalityId, role })
  })
  if (!res.ok) throw new Error('Failed to add personality to episode')
}

export const removePersonalityFromEpisode = async (
  episodeId: number,
  personalityId: number
): Promise<void> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-episode/${episodeId}/${personalityId}`, {
    method: 'DELETE',
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to remove personality from episode')
}

export const fetchPersonalitiesByPodcast = async (podcastId: number): Promise<Personality[]> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-podcast?podcastId=${podcastId}`, {
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to fetch podcast personalities')
  return res.json()
}

export const fetchPersonalitiesByEpisode = async (episodeId: number): Promise<Personality[]> => {
  const res = await fetch(`${apiBaseUrl}/personalities/by-episode?episodeId=${episodeId}`, {
    headers: headers()
  })
  if (!res.ok) throw new Error('Failed to fetch episode personalities')
  return res.json()
}
