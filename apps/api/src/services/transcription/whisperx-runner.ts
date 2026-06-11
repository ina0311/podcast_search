import { env } from '@podcast_search/config'
import type { PersonalityWithSamples } from '@podcast_search/database'

export interface WhisperSegment {
  text: string
  startMs: number
  endMs: number
  speakerLabel?: string
}

export interface TranscribeOptions {
  personalities: PersonalityWithSamples[]
  timeoutMs?: number
  model?: string
}

export async function transcribeAudio(
  audioPath: string,
  options: TranscribeOptions
): Promise<WhisperSegment[]> {
  const { personalities, timeoutMs = 20 * 60 * 1000, model = 'turbo' } = options

  const personalitiesPayload = personalities
    .filter((p) => p.audioSamples.length > 0)
    .flatMap((p) =>
      p.audioSamples
        .filter((s) => s.embedding != null)
        .map((s) => ({
          name: p.name,
          embedding: s.embedding as number[]
        }))
    )

  const numSpeakers = personalities.length > 0 ? personalities.length : null

  const response = await fetch(`${env.WHISPERX_SERVICE_URL}/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_path: audioPath,
      personalities: personalitiesPayload,
      num_speakers: numSpeakers,
      model,
      hf_token: env.HUGGINGFACE_TOKEN ?? ''
    }),
    signal: AbortSignal.timeout(timeoutMs)
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`WhisperX service error ${response.status}: ${text}`)
  }

  const { segments }: { segments: WhisperSegment[] } = await response.json()
  return segments
}
