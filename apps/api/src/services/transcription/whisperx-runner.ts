import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'
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

const SCRIPT_DIR = __dirname
const PYTHON_SCRIPT = join(SCRIPT_DIR, 'whisperx_transcribe.py')

export async function transcribeAudio(
  audioPath: string,
  options: TranscribeOptions
): Promise<WhisperSegment[]> {
  const { personalities, timeoutMs = 20 * 60 * 1000, model = 'turbo' } = options

  const outputDir = join(tmpdir(), 'podcast-ingestion')
  await mkdir(outputDir, { recursive: true })

  const audioBasename = basename(audioPath, extname(audioPath))
  const outputPath = join(outputDir, `${audioBasename}-whisperx.json`)

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

  const numSpeakers = personalities.length > 0 ? personalities.length : undefined

  const args = [
    PYTHON_SCRIPT,
    '--audio',
    audioPath,
    '--output',
    outputPath,
    '--model',
    model,
    '--personalities',
    JSON.stringify(personalitiesPayload)
  ]
  if (env.HUGGINGFACE_TOKEN) {
    args.push('--hf_token', env.HUGGINGFACE_TOKEN)
  }
  if (numSpeakers) {
    args.push('--num_speakers', String(numSpeakers))
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('python3', args, { cwd: SCRIPT_DIR })

      proc.stderr?.on('data', (data: Buffer) => {
        process.stderr.write(`[whisperx] ${data}`)
      })

      const timer = setTimeout(() => {
        proc.kill()
        reject(new Error('WhisperX timed out'))
      }, timeoutMs)

      proc.on('close', (code: number | null) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`WhisperX exited with code ${code}`))
      })

      proc.on('error', (err: Error) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    const raw: WhisperSegment[] = JSON.parse(await readFile(outputPath, 'utf-8'))
    return raw
  } finally {
    try {
      await rm(outputPath)
    } catch {}
  }
}
