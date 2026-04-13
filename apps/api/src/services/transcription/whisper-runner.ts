import { spawn } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, extname, join } from 'node:path'

export interface WhisperSegment {
  text: string
  startMs: number
  endMs: number
}

export async function transcribeAudio(
  audioPath: string,
  timeoutMs = 10 * 60 * 1000
): Promise<WhisperSegment[]> {
  const outputDir = join(tmpdir(), 'podcast-ingestion')
  await mkdir(outputDir, { recursive: true })

  const audioBasename = basename(audioPath, extname(audioPath))
  const jsonPath = join(outputDir, `${audioBasename}.json`)

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('whisper', [
        audioPath,
        '--output_format',
        'json',
        '--output_dir',
        outputDir
      ])

      const timer = setTimeout(() => {
        proc.kill()
        reject(new Error('Whisper timed out'))
      }, timeoutMs)

      proc.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(`Whisper exited with code ${code}`))
      })

      proc.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })

    const raw = JSON.parse(await readFile(jsonPath, 'utf-8'))
    const segments: any[] = raw.segments ?? []
    return segments.map((seg) => ({
      text: String(seg.text).trim(),
      startMs: Math.round(seg.start * 1000),
      endMs: Math.round(seg.end * 1000)
    }))
  } finally {
    // 成功・失敗・タイムアウト問わず一時ファイルを削除
    try {
      await rm(jsonPath)
    } catch {}
  }
}
