import { env } from '@podcast_search/config'
import { createClient } from '@supabase/supabase-js'

export function getSupabaseClient() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL and service role key are required for storage operations')
  }
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function uploadAudioSample(file: ArrayBuffer, filename: string): Promise<string> {
  const supabase = getSupabaseClient()
  const bucket = env.SUPABASE_STORAGE_BUCKET

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filename, file, { contentType: 'audio/mpeg', upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from(bucket).getPublicUrl(filename)
  return data.publicUrl
}

export async function deleteAudioSample(filename: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([filename])
  if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
