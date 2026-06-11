const apiBaseUrl = import.meta.env.VITE_API_URL ?? '/api'
const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY ?? ''

const adminHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Admin-Key': adminApiKey
})

export interface IngestStatus {
  status: 'idle' | 'running' | 'done' | 'error'
  total: number
  done: number
  errors: { episodeId: number; message: string }[]
}

export const triggerIngest = async (options: {
  rssUrl: string
  podcastId?: number
}): Promise<{ jobId: string }> => {
  const res = await fetch(`${apiBaseUrl}/admin/ingest`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(options)
  })
  if (!res.ok) throw new Error(`Ingest request failed: ${res.status}`)
  return res.json()
}

export const fetchIngestStatus = async (): Promise<IngestStatus> => {
  const res = await fetch(`${apiBaseUrl}/admin/ingest/status`, {
    headers: adminHeaders()
  })
  if (!res.ok) throw new Error(`Status request failed: ${res.status}`)
  return res.json()
}
